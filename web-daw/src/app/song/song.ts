import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { PianoRoll } from '../piano-roll/piano-roll';
import { InstrumentSettingsBar } from '../instrument-settings-bar/instrument-settings-bar';

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
  type?: string;
  patterns: Pattern[];
}

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [CommonModule, FormsModule, PianoRoll, InstrumentSettingsBar],
  templateUrl: './song.html',
  styleUrls: ['./song.css']
})
export class Song {
  private storageKey = 'web-daw-song-data';

  instruments: Instrument[] = [
    {
      id: 'synth-1',
      name: 'Synth 1',
      type: 'synth',
      patterns: [
        { id: 'p1', name: 'Pattern 1', track: { notes: [] } }
      ]
    },
    {
      id: 'drum-1',
      name: 'Drum 1',
      type: 'drum',
      patterns: [
        { id: 'p1', name: 'Beat 1', track: { notes: [] } }
      ]
    }
  ];

  currentInstrumentId = 'synth-1';
  currentPatternId = 'p1';
  newInstrumentType = 'synth';
  showInstrumentPopup = false;
  showInstrumentSettingsPopup = false;
  selectedInstrument: Instrument | null = null;

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

  // --- Instrument management ---
  addInstrument(type: string) {
    const count = this.instruments.filter(i => i.type === type).length + 1;
    const id = `${type}-${count}`;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`;
    const defaultPattern: Pattern = {
      id: 'p1',
      name: type === 'drum' ? 'Beat 1' : 'Pattern 1',
      track: { notes: [] }
    };
    const newInstrument: Instrument = {
      id,
      name,
      type,
      patterns: [defaultPattern]
    };
    this.instruments.push(newInstrument);
    this.currentInstrumentId = id;
    this.currentPatternId = 'p1';
    this.saveToStorage();
  }

  openInstrumentSettings(inst: Instrument) {
    this.selectedInstrument = inst;
    this.showInstrumentSettingsPopup = true;
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
