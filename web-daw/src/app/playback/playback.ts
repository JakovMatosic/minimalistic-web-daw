import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Instrument {
  id: string;
  name: string;
  type?: string;
  patterns: any[];
}

interface SequenceItem {
  instrumentId: string;
  patternId: string;
}

@Component({
  selector: 'app-playback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playback.html',
  styleUrls: ['./playback.css']
})
export class Playback implements OnInit, OnChanges {
  @Input() bpm: number = 120;
  @Input() isPlaying: boolean = false;
  @Input() instruments: Instrument[] = [];
  @Output() bpmChange = new EventEmitter<number>();
  @Output() togglePlay = new EventEmitter<void>();
  @Output() sequenceChange = new EventEmitter<SequenceItem[][]>();

  // Sequencer data: array of arrays, where each sub-array is a column (time step)
  // Each column contains SequenceItem[] representing which patterns play at that step
  sequence: SequenceItem[][] = [];
  sequenceLength = 0;

  // Track which cell has its pattern selector open
  openPatternSelector: { stepIndex: number; instrumentId: string } | null = null;

  ngOnInit() {
    this.initializeSequence();
  }

  ngOnChanges() {
    if (this.instruments.length > 0 && this.sequence.length === 0) {
      this.initializeSequence();
    }
  }

  initializeSequence() {
    if (this.instruments.length === 0) return;
    // Start with an empty 8-step sequence
    this.sequenceLength = 8;
    this.sequence = Array(this.sequenceLength).fill(null).map(() => []);
    // Emit the initial sequence so Song gets it
    this.sequenceChange.emit(this.sequence);
  }

  addSequenceStep() {
    this.sequenceLength++;
    this.sequence.push([]);
    this.sequenceChange.emit(this.sequence);
  }

  removeSequenceStep() {
    if (this.sequenceLength > 1) {
      this.sequenceLength--;
      this.sequence.pop();
      this.sequenceChange.emit(this.sequence);
    }
  }

  addPatternToSequence(instrumentId: string, stepIndex: number) {
    // Just open the pattern selector dropdown
    this.openPatternSelector = { stepIndex, instrumentId };
  }

  selectPatternForSequence(instrumentId: string, stepIndex: number, patternId: string) {
    if (!patternId) return;
    
    const existingIndex = this.sequence[stepIndex].findIndex(item => item.instrumentId === instrumentId);
    if (existingIndex >= 0) {
      return; // Already has a pattern for this instrument
    }

    this.sequence[stepIndex].push({
      instrumentId,
      patternId
    });
    this.openPatternSelector = null;
    this.sequenceChange.emit(this.sequence);
  }

  closePatternSelector() {
    this.openPatternSelector = null;
  }

  onPatternSelectChange(event: Event, instrumentId: string, stepIdx: number) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectPatternForSequence(instrumentId, stepIdx, value);
  }

  removePatternFromSequence(stepIndex: number, itemIndex: number) {
    this.sequence[stepIndex].splice(itemIndex, 1);
    this.sequenceChange.emit(this.sequence);
  }

  changePatternInSequence(stepIndex: number, itemIndex: number, newPatternId: string) {
    this.sequence[stepIndex][itemIndex].patternId = newPatternId;
    this.sequenceChange.emit(this.sequence);
  }

  getInstrumentPatterns(instrumentId: string) {
    const instrument = this.instruments.find(i => i.id === instrumentId);
    return instrument?.patterns || [];
  }

  hasPatternInStep(instrumentId: string, stepIndex: number): boolean {
    return this.sequence[stepIndex].some(item => item.instrumentId === instrumentId);
  }

  onBpmChange() {
    this.bpmChange.emit(this.bpm);
  }

  onTogglePlay() {
    this.togglePlay.emit();
  }
}
