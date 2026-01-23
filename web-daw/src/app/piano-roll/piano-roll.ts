import { Component, HostListener, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPitchAllowed, ScaleType } from '../song/scales/scales';

interface Note {
  pitch: string;
  start: number;
  duration: number;
}

interface Track {
  notes: Note[];
}

@Component({
  selector: 'app-piano-roll',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './piano-roll.html',
  styleUrls: ['./piano-roll.css']
})
export class PianoRoll implements OnInit, OnChanges {
  @Input() track!: Track;
  @Input() minOctave = 4;
  @Input() maxOctave = 5;
  @Input() rootKey = 0;
  @Input() scale: ScaleType = 'major';

  octaves = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  pitches: string[] = [];
  totalSteps = 16;
  quarterSteps = 64;

  isDrawing = false;
  isResizing = false;
  currentNote: Note | null = null;
  resizeNote: Note | null = null;
  resizeEdge: 'left' | 'right' | null = null;
  startStep: number | null = null;
  selectedNote: Note | null = null;

  noteHeight = '';

  updatePitches() {
    this.pitches = [];
    const shiftedOctaves = this.getShiftedOctaves();
    for (let octave = this.maxOctave; octave >= this.minOctave; octave--) {
      for (let i = shiftedOctaves.length - 1; i >= 0; i--) {
        this.pitches.push(`${shiftedOctaves[i]}${octave}`);
      }
    }
    this.noteHeight = `calc(100% / ${this.pitches.length})`;
  }


  ngOnInit() {
    this.updatePitches();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['minOctave'] || changes['maxOctave'] || changes['rootKey'] || changes['scale']) {
      this.updatePitches();
    }
  }

  get gridCells() {
    return this.pitches.flatMap(pitch =>
      Array.from({ length: this.totalSteps }, (_, step) => ({ pitch, step }))
    );
  }

  getQuarterGridCells() {
    return Array.from({ length: this.quarterSteps }, (_, i) => ({
      isMajor: i % 4 === 0
    }));
  }

  handleNoteMouseDown(event: MouseEvent, note: Note) {
    event.stopPropagation();
    this.selectedNote = note;

    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle-left')) {
      this.startResizing(note, 'left');
    } else if (target.classList.contains('resize-handle-right')) {
      this.startResizing(note, 'right');
    } else {
      // Clicking on the note itself (not a resize handle) deletes it
      this.deleteNote(note);
    }
  }

  startResizing(note: Note, edge: 'left' | 'right') {
    this.isResizing = true;
    this.resizeNote = note;
    this.resizeEdge = edge;
    this.startStep = edge === 'left' ? note.start : note.start + note.duration;
  }

  handleGridMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.selectedNote = null;
    this.isDrawing = true;

    const grid = (event.currentTarget as HTMLElement).querySelector('.grid') as HTMLElement;
    const rect = grid.getBoundingClientRect();
    const relY = event.clientY - rect.top;
    const relX = event.clientX - rect.left;

    const pitchIndex = Math.floor((relY / rect.height) * this.pitches.length);
    const pitch = this.pitches[pitchIndex];

    if (this.isRowDisabled(pitch)) {
      return;
    }
    const quarterStep = Math.floor((relX / rect.width) * this.quarterSteps);

    this.currentNote = { pitch, start: quarterStep, duration: 1 };
    this.startStep = quarterStep;
    this.track.notes.push(this.currentNote);
  }

  handleMouseMove(event: MouseEvent) {
    if (this.isResizing && this.resizeNote && this.resizeEdge) {
      const grid = (event.currentTarget as HTMLElement).querySelector('.grid') as HTMLElement;
      const rect = grid.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const quarterStep = Math.floor((relativeX / rect.width) * this.quarterSteps);
      this.updateNoteResize(quarterStep);
    } else if (this.isDrawing && this.currentNote && this.startStep !== null) {
      const grid = (event.currentTarget as HTMLElement).querySelector('.grid') as HTMLElement;
      const rect = grid.getBoundingClientRect();
      const relX = event.clientX - rect.left;
      const quarterStep = Math.round((relX / rect.width) * this.quarterSteps);

      const newDuration = quarterStep - this.startStep;
      if (newDuration >= 0) {
        this.currentNote.start = this.startStep;
        this.currentNote.duration = newDuration || 1;
      } else {
        this.currentNote.start = quarterStep;
        this.currentNote.duration = this.startStep - quarterStep;
      }
    }
  }

  endNote() {
    if (this.isDrawing && this.currentNote && this.currentNote.duration <= 0) {
      this.deleteNote(this.currentNote);
    }
    this.isDrawing = false;
    this.isResizing = false;
    this.currentNote = null;
    this.resizeNote = null;
    this.resizeEdge = null;
    this.startStep = null;
  }


  updateNoteResize(quarterStep: number) {
    if (!this.resizeNote || !this.resizeEdge) return;

    if (this.resizeEdge === 'right') {
      const newDuration = quarterStep - this.resizeNote.start;
      if (newDuration > 0) this.resizeNote.duration = newDuration;
    } else {
      const endStep = this.resizeNote.start + this.resizeNote.duration;
      const newStart = quarterStep;
      const newDuration = endStep - newStart;
      if (newDuration > 0 && newStart >= 0) {
        this.resizeNote.start = newStart;
        this.resizeNote.duration = newDuration;
      }
    }
  }

  deleteNote(note: Note) {
    this.track.notes = this.track.notes.filter(n => n !== note);
    if (this.selectedNote === note) this.selectedNote = null;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete' && this.selectedNote) {
      this.deleteNote(this.selectedNote);
    }
  }

  isNoteVisible(note: Note): boolean {
    return this.pitches.includes(note.pitch);
  }

  isRowDisabled(pitch: string): boolean {
    return !isPitchAllowed(pitch, this.rootKey, this.scale);
  }


  getNoteTop(pitch: string): string {
    const index = this.pitches.indexOf(pitch);
    if (index === -1) return '0%';
    return `${(index / this.pitches.length) * 100}%`;
  }

  getNoteLeft(start: number): string {
    return `${(start / this.quarterSteps) * 100}%`;
  }

  getNoteWidth(duration: number): string {
    return `${(duration / this.quarterSteps) * 100}%`;
  }

  getShiftedOctaves(): string[] {
    // rootKey is 0-11 integer representing semitone from C
    const n = this.rootKey % 12;
    return [...this.octaves.slice(n), ...this.octaves.slice(0, n)];
  }

}
