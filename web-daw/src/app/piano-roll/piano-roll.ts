import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class PianoRoll {
  octaves = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  pitches: string[] = [];
  totalSteps = 16;
  quarterSteps = 64;
  track: Track = { notes: [] };

  isDrawing = false;
  isResizing = false;
  currentNote: Note | null = null;
  resizeNote: Note | null = null;
  resizeEdge: 'left' | 'right' | null = null;
  startStep: number | null = null;
  selectedNote: Note | null = null;

  noteHeight = 'calc(100% / ' + (12 * 3) + ')';

  constructor() {
    // Generate pitches from C5 down to C3
    for (let octave = 5; octave >= 3; octave--) {
      this.octaves.forEach(note => this.pitches.push(`${note}${octave}`));
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

    if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
      this.deleteNote(note);
      return;
    }

    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle-left')) {
      this.startResizing(note, 'left');
    } else if (target.classList.contains('resize-handle-right')) {
      this.startResizing(note, 'right');
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
    const quarterStep = Math.round((relX / rect.width) * this.quarterSteps);

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

  getNoteTop(pitch: string): string {
    const index = this.pitches.indexOf(pitch);
    return `${(index / this.pitches.length) * 100}%`;
  }

  getNoteLeft(start: number): string {
    return `${(start / this.quarterSteps) * 100}%`;
  }

  getNoteWidth(duration: number): string {
    return `${(duration / this.quarterSteps) * 100}%`;
  }
}
