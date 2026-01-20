import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { PianoRoll } from '../piano-roll/piano-roll';
import { InstrumentSettingsBar } from '../instrument-settings-bar/instrument-settings-bar';
import { Playback } from '../playback/playback';
import { AudioEngine } from '../audio/audio-engine';
import { INSTRUMENT_LABELS, InstrumentType } from '../audio/instrument-types';
import { Instrument, Pattern, createInstrument } from '../song/instruments/instrument-config';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [CommonModule, FormsModule, PianoRoll, InstrumentSettingsBar, Playback],
  templateUrl: './song.html',
  styleUrls: ['./song.css']
})
export class Song {
  private storageKey = 'web-daw-song-data';
  readonly INSTRUMENT_LABELS = INSTRUMENT_LABELS;
  instrumentTypes = Object.keys(INSTRUMENT_LABELS) as InstrumentType[];

  instruments: Instrument[] = [
    createInstrument('synth', 1),
    createInstrument('drum', 1)
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
  sequence: any[][] = [];

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

    const pattern = this.currentPattern;
    this.pianoRollMinOctave = pattern.minOctave;
    this.pianoRollMaxOctave = pattern.maxOctave;

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

  trackByInstrumentId(index: number, inst: Instrument) {
    return inst.id;
  }


  onSequenceChange(newSequence: any[][]) {
    this.sequence = newSequence;
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
  addInstrument(type: InstrumentType) {
    const count =
      this.instruments.filter(i => i.type === type).length + 1;

    const newInstrument = createInstrument(type, count);

    this.instruments.push(newInstrument);
    this.currentInstrumentId = newInstrument.id;
    this.currentPatternId = 'p1';

    const p = newInstrument.patterns[0];
    this.pianoRollMinOctave = p.minOctave;
    this.pianoRollMaxOctave = p.maxOctave;

    // Apply initial volume to audio engine
    if (newInstrument.volume !== undefined) {
      const volumeNormalized = newInstrument.volume / 100;
      this.audio.updateVolume(newInstrument.id, volumeNormalized);
    }

    this.saveToStorage();
  }

  deleteCurrentInstrument() {
    // Prevent deleting if it's the last instrument
    if (this.instruments.length <= 1) {
      alert('Cannot delete the last instrument. You must have at least one instrument.');
      return;
    }

    const instrument = this.currentInstrument;
    const confirmDelete = confirm(`Delete instrument "${instrument.name}"?`);
    if (!confirmDelete) return;

    // Remove the instrument
    this.instruments = this.instruments.filter(i => i.id !== this.currentInstrumentId);

    // Switch to the first remaining instrument
    this.currentInstrumentId = this.instruments[0].id;
    this.currentPatternId = this.instruments[0].patterns[0].id;
    const pattern = this.currentPattern;
    this.pianoRollMinOctave = pattern.minOctave;
    this.pianoRollMaxOctave = pattern.maxOctave;

    this.saveToStorage();
  }

  openInstrumentSettings(inst: Instrument) {
    this.selectedInstrument = inst;
    this.showInstrumentSettingsPopup = true;
  }

  onInstrumentSettingsChange() {
    // Update audio engine volumes for all instruments
    this.instruments.forEach(inst => {
      if (inst.volume !== undefined) {
        const volumeNormalized = inst.volume / 100; // Convert 0-100 to 0-1
        this.audio.updateVolume(inst.id, volumeNormalized);
      }
    });
    this.saveToStorage();
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

    // Pre-create all instrument voices before scheduling notes
    // This prevents delays during playback
    const instrumentsToPreload = this.instruments.map(inst => ({
      id: inst.id,
      type: inst.type || 'synth'
    }));
    await this.audio.preloadInstruments(instrumentsToPreload);
    
    // Apply volumes to all preloaded instruments
    this.instruments.forEach(inst => {
      if (inst.volume !== undefined) {
        const volumeNormalized = inst.volume / 100;
        this.audio.updateVolume(inst.id, volumeNormalized);
      }
    });

    // Duration of one 16th-note
    const noteStepDuration = 60 / this.bpm / 4;
    // 16 bars of 4 notes
    const PATTERN_NOTES = 16 * 4;
    const patternStepDuration = noteStepDuration * PATTERN_NOTES;

    // Get the current audio time and add a small buffer to ensure everything is ready
    // This ensures we don't schedule notes in the past or at exactly now()
    const currentTime = this.audio.now();
    const bufferTime = 0.1; // 100ms buffer to ensure AudioContext is fully ready
    const scheduleStartTime = currentTime + bufferTime;

    let latest = 0;

    if (!this.sequence || this.sequence.length === 0) {
      this.isPlaying = true;
      this.stopTimer = setTimeout(() => {
        this.isPlaying = false;
        this.stopTimer = null;
      }, 1000);
      return;
    }

    // Play through the sequence (each "step" = one pattern)
    this.sequence.forEach((sequenceStep, seqStepIndex) => {
      const stepStartTime = scheduleStartTime + seqStepIndex * patternStepDuration;

      sequenceStep.forEach((sequenceItem: any) => {
        const instrument = this.instruments.find(i => i.id === sequenceItem.instrumentId);
        const pattern = instrument?.patterns.find(p => p.id === sequenceItem.patternId);
        if (!pattern) return;
        if (!instrument) return;

        // Schedule each note
        (pattern.track.notes || []).forEach((n: any) => {
          const when = stepStartTime + n.start * noteStepDuration;
          const dur = Math.max(0.02, n.duration * noteStepDuration);
          // Convert volume from 0-100 range to 0-1 range, default to 0.8 if not set
          const vol = instrument.volume !== undefined ? instrument.volume / 100 : 0.8;

          this.audio.playNote(
            instrument.id,
            instrument.type || 'synth',
            n.pitch,
            when,
            dur,
            vol
          );

          latest = Math.max(latest, when + dur);
        });
      });
    });

    // If no notes were scheduled, assume full length of sequence
    if (latest === 0) {
      latest = this.sequence.length * patternStepDuration;
    }

    const playDuration = Math.max(2, latest + 0.5);

    this.isPlaying = true;
    this.stopTimer = setTimeout(() => {
      this.isPlaying = false;
      this.stopTimer = null;
    }, playDuration * 1000);
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
    if (!saved) {
      // Initialize volumes for default instruments
      this.instruments.forEach(inst => {
        if (inst.volume === undefined) inst.volume = 80;
      });
      return;
    }

    try {
      const data = JSON.parse(saved);
      this.instruments = data.instruments || this.instruments;
      this.currentInstrumentId = data.currentInstrumentId || 'piano';
      this.currentPatternId = data.currentPatternId || 'p1';

      // Ensure all instruments have volume set and apply to audio engine
      this.instruments.forEach(inst => {
        if (inst.volume === undefined) inst.volume = 80;
        const volumeNormalized = inst.volume / 100;
        this.audio.updateVolume(inst.id, volumeNormalized);
      });
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
