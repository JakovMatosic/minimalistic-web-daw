import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { PianoRoll } from '../piano-roll/piano-roll';
import { InstrumentSettingsBar } from '../instrument-settings-bar/instrument-settings-bar';
import { AudioEngine } from '../audio/audio-engine';

interface Note {
  pitch: string;
  start: number;
  duration: number;
}

interface Pattern {
  id: string;
  name: string;
  track: { notes: Note[] };
  minOctave: number;
  maxOctave: number;
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
        { id: 'p1', name: 'Pattern 1', track: { notes: [] }, minOctave: 4, maxOctave: 5 }
      ]
    },
    {
      id: 'drum-1',
      name: 'Drum 1',
      type: 'drum',
      patterns: [
        { id: 'p1', name: 'Beat 1', track: { notes: [] }, minOctave: 4, maxOctave: 5 }
      ]
    }
  ];

  currentInstrumentId = 'synth-1';
  currentPatternId = 'p1';
  newInstrumentType = 'synth';
  showInstrumentPopup = false;
  showInstrumentSettingsPopup = false;
  selectedInstrument: Instrument | null = null;

  // playback
  bpm = 120;
  isPlaying = false;
  private stopTimer: any = null;

  // Piano roll octave range
  pianoRollMinOctave = 4;
  pianoRollMaxOctave = 5;

  constructor(private audio: AudioEngine) {
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
    const pattern = this.currentPattern;
    this.pianoRollMinOctave = pattern.minOctave;
    this.pianoRollMaxOctave = pattern.maxOctave;
    this.saveToStorage();
  }

  trackByPatternId(index: number, pattern: Pattern) {
    return pattern.id;
  }

  // --- Pattern management ---
  addPattern() {
    const name = prompt('Enter new pattern name:');
    if (!name) return;

    const id = `p${Date.now()}`;
    const newPattern: Pattern = { id, name, track: { notes: [] }, minOctave: 4, maxOctave: 5 };

    this.currentInstrument.patterns.push(newPattern);
    this.currentPatternId = id;
    this.pianoRollMinOctave = newPattern.minOctave;
    this.pianoRollMaxOctave = newPattern.maxOctave;
    this.saveToStorage();
  }

  deleteCurrentPattern() {
    const instrument = this.currentInstrument;

    const confirmDelete = confirm(`Delete pattern "${this.currentPattern.name}"?`);
    if (!confirmDelete) return;

    // Remove the pattern
    instrument.patterns = instrument.patterns.filter(p => p.id !== this.currentPatternId);

    // If no patterns left, create a new one called "Pattern 1"
    if (instrument.patterns.length === 0) {
      const newPattern: Pattern = {
        id: `p${Date.now()}`,
        name: 'Pattern 1',
        track: { notes: [] },
        minOctave: 4,
        maxOctave: 5
      };
      instrument.patterns.push(newPattern);
      this.currentPatternId = newPattern.id;
      this.pianoRollMinOctave = newPattern.minOctave;
      this.pianoRollMaxOctave = newPattern.maxOctave;
    } else {
      this.currentPatternId = instrument.patterns[0].id;
      const pattern = this.currentPattern;
      this.pianoRollMinOctave = pattern.minOctave;
      this.pianoRollMaxOctave = pattern.maxOctave;
    }

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
      track: { notes: [] },
      minOctave: 4,
      maxOctave: 5
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

  // --- Playback control ---
  async togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      await this.play();
    }
  }

  async play() {
    await this.audio.ensureStarted();
    this.audio.stopAll();

    const now = this.audio.now();
    const stepDuration = 60 / this.bpm / 4; // 16 steps == 4 beats => step = quarter/4

    let latest = 0;
    this.instruments.forEach(inst => {
      const pattern = inst.patterns[0];
      if (!pattern) return;
      (pattern.track.notes || []).forEach(n => {
        const when = n.start * stepDuration;
        const dur = Math.max(0.02, n.duration * stepDuration);
        const vol = (inst as any).volume ? (inst as any).volume / 100 : 0.8;
        this.audio.playNote(n.pitch, when, dur, vol);
        latest = Math.max(latest, when + dur);
      });
    });

    this.isPlaying = true;
    this.stopTimer = setTimeout(() => {
      this.isPlaying = false;
      this.stopTimer = null;
    }, (latest + 0.2) * 1000);
  }

  stop() {
    this.audio.stopAll();
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.isPlaying = false;
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

  updatePianoRollOctaves() {
    if (this.pianoRollMinOctave >= this.pianoRollMaxOctave) {
      alert('Min octave must be less than max octave');
      this.pianoRollMinOctave = this.pianoRollMaxOctave - 1;
    }
    // Save octaves to current pattern
    this.currentPattern.minOctave = this.pianoRollMinOctave;
    this.currentPattern.maxOctave = this.pianoRollMaxOctave;
    this.saveToStorage();
  }
}
