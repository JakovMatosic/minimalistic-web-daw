import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PianoRoll } from '../piano-roll/piano-roll';

interface Note {
  pitch: string;
  start: number;
  duration: number;
}

interface Pattern {
  id: string;
  name: string;
  track: { notes: Note[] };
}

interface Instrument {
  id: string;
  name: string;
  patterns: Pattern[];
}

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [CommonModule, PianoRoll],
  templateUrl: './song.html',
  styleUrls: ['./song.css']
})
export class Song {
  private storageKey = 'web-daw-song-data';

  instruments: Instrument[] = [
    {
      id: 'piano',
      name: 'Piano',
      patterns: [
        { id: 'p1', name: 'Pattern 1', track: { notes: [] } },
        { id: 'p2', name: 'Pattern 2', track: { notes: [] } }
      ]
    },
    {
      id: 'drums',
      name: 'Drums',
      patterns: [
        { id: 'p1', name: 'Beat 1', track: { notes: [] } }
      ]
    }
  ];

  currentInstrumentId = 'piano';
  currentPatternId = 'p1';

  constructor() {
    this.loadFromStorage();
  }

  // --- Getters for current instrument/pattern ---
  get currentInstrument() {
    return this.instruments.find(i => i.id === this.currentInstrumentId)!;
  }

  get currentPattern() {
    return this.currentInstrument.patterns.find(p => p.id === this.currentPatternId)!;
  }

  // --- Event handlers ---
  handleInstrumentChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.currentInstrumentId = select.value;
    this.currentPatternId = this.currentInstrument.patterns[0].id;
    this.saveToStorage();
  }

  handlePatternChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.currentPatternId = select.value;
    this.saveToStorage();
  }

  // --- Pattern management ---
  addPattern() {
    const name = prompt('Enter new pattern name:');
    if (!name) return;

    const id = `p${Date.now()}`;
    const newPattern: Pattern = { id, name, track: { notes: [] } };

    this.currentInstrument.patterns.push(newPattern);
    this.currentPatternId = id;
    this.saveToStorage();
  }

  deleteCurrentPattern() {
    const instrument = this.currentInstrument;

    if (instrument.patterns.length <= 1) {
      alert('You must keep at least one pattern.');
      return;
    }

    const confirmDelete = confirm(`Delete pattern "${this.currentPattern.name}"?`);
    if (!confirmDelete) return;

    instrument.patterns = instrument.patterns.filter(p => p.id !== this.currentPatternId);
    this.currentPatternId = instrument.patterns[0].id;
    this.saveToStorage();
  }

  // --- Persistence ---
  saveToStorage() {
    const data = {
      instruments: this.instruments,
      currentInstrumentId: this.currentInstrumentId,
      currentPatternId: this.currentPatternId,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      this.instruments = data.instruments || this.instruments;
      this.currentInstrumentId = data.currentInstrumentId || 'piano';
      this.currentPatternId = data.currentPatternId || 'p1';
    } catch (e) {
      console.error('Failed to load song data:', e);
    }
  }
}
