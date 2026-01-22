import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { PianoRoll } from '../piano-roll/piano-roll';
import { InstrumentSettingsBar } from '../instrument-settings-bar/instrument-settings-bar';
import { Playback } from '../playback/playback';
import { AudioEngine } from '../audio/audio-engine';
import { INSTRUMENT_LABELS, InstrumentType } from '../audio/instrument-types';
import { Instrument, Pattern, createInstrument } from '../song/instruments/instrument-config';
import { Frequency } from 'tone';
import { KEYS, SCALES, ScaleType } from './scales/scales';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [CommonModule, FormsModule, PianoRoll, InstrumentSettingsBar, Playback],
  templateUrl: './song.html',
  styleUrls: ['./song.css']
})
export class Song {
  private storageKey = 'web-daw-song-data';
  pitchFrequencyCache: Record<string, number> = {};
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
  private hasInteracted = false;
  isPrimed = false;
  isPriming = false;

  // Piano roll octave range
  pianoRollMinOctave = 4;
  pianoRollMaxOctave = 5;

  // Song-wide musical context
  rootKey: number = 0; // 0 = C
  scale: ScaleType = 'major';
  scaleTypes = Object.keys(SCALES) as ScaleType[];
  keys = KEYS


  constructor(private audio: AudioEngine) {
    this.loadFromStorage();
  }

  /**
   * Called on first user interaction to start AudioContext early.
   */
  onUserInteraction() {
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      // Just start AudioContext - priming will be done via button
      this.audio.ensureStarted().catch(() => { });
    }
  }

  // --- Getters for current instrument/pattern ---
  get currentInstrument() {
    return this.instruments.find(i => i.id === this.currentInstrumentId)!;
  }

  get currentPattern() {
    return this.currentInstrument.patterns.find(p => p.id === this.currentPatternId)!;
  }

  private setCurrentInstrument(instrumentId: string) {
    this.currentInstrumentId = instrumentId;
    this.currentPatternId = this.currentInstrument.patterns[0].id;

    const pattern = this.currentPattern;
    this.pianoRollMinOctave = pattern.minOctave;
    this.pianoRollMaxOctave = pattern.maxOctave;

    this.saveToStorage();
  }

  // --- Event handlers ---
  handleInstrumentChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.setCurrentInstrument(select.value);
  }

  openInstrumentFromPlayback(instrumentId: string) {
    this.setCurrentInstrument(instrumentId);
  }

  handlePatternChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.currentPatternId = select.value;
    const pattern = this.currentPattern;
    this.pianoRollMinOctave = pattern.minOctave;
    this.pianoRollMaxOctave = pattern.maxOctave;
    this.saveToStorage();
  }

  onKeyOrScaleChange() {
    this.saveToStorage();
  }

  trackByPatternId(index: number, pattern: Pattern) {
    return pattern.id;
  }

  trackByInstrumentId(index: number, inst: Instrument) {
    return inst.id;
  }
  trackByKey(index: number, key: { value: number }) {
    return key.value;
  }

  trackByScale(index: number, scale: ScaleType) {
    return scale;
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

    // Reset primed flag - user needs to prime again after adding instrument
    this.isPrimed = false;

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

  /**
   * Prime all instruments - do all the heavy lifting here.
   * This should be called before play() to ensure instant playback.
   */
  async prime() {
    if (this.isPriming) return;
    this.isPriming = true;

    try {
      await this.audio.ensureStarted();

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

      // Build pitch cache now!
      this.buildPitchFrequencyCache();

      this.isPrimed = true;
    } catch (e) {
      console.error('Priming failed:', e);
      this.isPrimed = false;
    } finally {
      this.isPriming = false;
    }
  }

  buildPitchFrequencyCache() {
    this.pitchFrequencyCache = {};

    for (let i = 0; i < this.instruments.length; i++) {
      const inst = this.instruments[i];

      for (let p = 0; p < inst.patterns.length; p++) {
        const pattern = inst.patterns[p];
        const notes = pattern.track.notes || [];

        for (let n = 0; n < notes.length; n++) {
          const pitch = notes[n].pitch;

          if (this.pitchFrequencyCache[pitch] === undefined) {
            this.pitchFrequencyCache[pitch] =
              Frequency(pitch).toFrequency();
          }
        }
      }
    }
  }



  async play() {
    // If not primed, prime first (but this should be done via button)
    if (!this.isPrimed) {
      await this.prime();
    }

    // Reset stop time and dispose old synths to cancel scheduled events, then recreate them
    this.audio.resetStopTime();
    await this.audio.stopAll(true); // Dispose to cancel scheduled events

    // Duration of one 16th-note
    const noteStepDuration = 60 / this.bpm / 4;
    // 16 bars of 4 notes
    const PATTERN_NOTES = 16 * 4;
    const patternStepDuration = noteStepDuration * PATTERN_NOTES;

    // Minimal buffer - everything is already primed
    const currentTime = this.audio.now();
    const scheduleStartTime = currentTime + 0.01; // Just 10ms buffer

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
    for (let seqStepIndex = 0; seqStepIndex < this.sequence.length; seqStepIndex++) {
      const sequenceStep = this.sequence[seqStepIndex];
      const stepStartTime =
        scheduleStartTime + seqStepIndex * patternStepDuration;

      for (let s = 0; s < sequenceStep.length; s++) {
        const sequenceItem = sequenceStep[s];
        const instrument = this.instruments.find(
          i => i.id === sequenceItem.instrumentId
        );
        if (!instrument) continue;

        const pattern = instrument.patterns.find(
          p => p.id === sequenceItem.patternId
        );
        if (!pattern) continue;

        const notes = pattern.track.notes || [];
        const vol =
          instrument.volume !== undefined
            ? instrument.volume / 100
            : 0.8;

        const isSoundFont =
          this.audio.instrumentVoices[instrument.id]?.kind === 'soundfont';

        for (let n = 0; n < notes.length; n++) {
          const note = notes[n];
          const when = stepStartTime + note.start * noteStepDuration;
          const dur = Math.max(0.02, note.duration * noteStepDuration);

          if (isSoundFont) {
            // Use pitch string
            this.audio.playNote(
              instrument.id,
              note.pitch,
              when,
              dur,
              vol
            );
          } else {
            // Use cached frequency
            const freq = this.pitchFrequencyCache[note.pitch];
            this.audio.playNote(
              instrument.id,
              freq,
              when,
              dur,
              vol
            );
          }

          if (when + dur > latest) {
            latest = when + dur;
          }
        }
      }
    }

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
    // Dispose synths to cancel all scheduled future events
    this.audio.stopAll(true);
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.isPlaying = false;
  }

  saveToStorage() {
    const data = {
      instruments: this.instruments,
      currentInstrumentId: this.currentInstrumentId,
      currentPatternId: this.currentPatternId,
      rootKey: this.rootKey,
      scale: this.scale,
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
      this.rootKey = data.rootKey ?? this.rootKey;
      this.scale = data.scale ?? this.scale;

      // Ensure all instruments have volume set and apply to audio engine
      this.instruments.forEach(inst => {
        if (inst.volume === undefined) inst.volume = 80;
        const volumeNormalized = inst.volume / 100;
        this.audio.updateVolume(inst.id, volumeNormalized);
      });

      // Reset primed flag - user needs to prime after loading
      this.isPrimed = false;
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

  /**
   * Truncate pattern name to max 9 characters for display
   * If longer than 9, shows first 6 characters + "..."
   */
  truncatePatternName(name: string): string {
    if (name.length <= 9) {
      return name;
    }
    return name.substring(0, 6) + '...';
  }
}
