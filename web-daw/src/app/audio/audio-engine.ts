import { Injectable } from '@angular/core';
import * as Tone from 'tone';
import Soundfont, { InstrumentName } from 'soundfont-player';

type AnyVoice = Tone.FMSynth | Tone.PolySynth | Tone.PluckSynth | Tone.Sampler | Soundfont.Player;

const SOUNDFONT_MAP: Record<string, InstrumentName> = {
  piano: 'acoustic_grand_piano',
  ep: 'electric_piano_1',
  bass: 'acoustic_bass',
  guitar: 'acoustic_guitar_nylon',
  strings: 'string_ensemble_1'
};

@Injectable({ providedIn: 'root' })
export class AudioEngine {
  private started = false;

  // Store Tone.js and SoundFont players per instrument id
  private instrumentVoices: Record<string, AnyVoice> = {};

  // Drum samples (keep as fallback)
  private drumSamples = {
    C3: 'kick.wav',
    D3: 'snare.wav',
    E3: 'hihat.wav'
  };

  async ensureStarted() {
    if (!this.started) {
      await Tone.start();
      this.started = true;
    }
  }

  now() {
    return Tone.now();
  }

  /**
   * Get or create an instrument voice.
   * For some instruments, load SoundFont instead of Tone synth.
   */
  async getOrCreateVoice(
  id: string,
  instrumentType: string
): Promise<AnyVoice> {
  if (this.instrumentVoices[id]) {
    return this.instrumentVoices[id];
  }

  let inst: AnyVoice;

  // ---- SoundFont instruments ----
  if (instrumentType in SOUNDFONT_MAP) {
    const audioContext =
      Tone.getContext().rawContext as AudioContext;

    inst = await Soundfont.instrument(
      audioContext,
      SOUNDFONT_MAP[instrumentType]
    );

    this.instrumentVoices[id] = inst;
    return inst;
  }

  // ---- Tone.js instruments ----
  switch (instrumentType) {
    case 'pad':
      inst = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, release: 1.5 }
      }).toDestination();
      break;

    case 'pluck':
      inst = new Tone.PluckSynth().toDestination();
      break;

    case 'drum':
      inst = new Tone.Sampler({
        urls: this.drumSamples,
        baseUrl: 'assets/drums/'
      }).toDestination();
      break;

    case 'synth':
    default:
      inst = new Tone.PolySynth(Tone.Synth).toDestination();
      break;
  }

  this.instrumentVoices[id] = inst;
  return inst;
}


  /**
   * Update the volume of an existing instrument voice.
   */
  updateVolume(instrumentId: string, volume: number) {
    const inst = this.instrumentVoices[instrumentId];
    if (!inst) return;

    // Handle Soundfont player - volume is set per note, so we don't need to update here
    if ('play' in inst && typeof inst.play === 'function' && !('triggerAttackRelease' in inst)) {
      // Soundfont volume is handled per note in playNote
      return;
    }

    // For Tone.js synths: set volume on the synth itself
    // Volume conversion: 0-1 range to dB
    // 0 = -96dB (silent), 1 = 0dB (full volume)
    const db = volume <= 0 ? -96 : Math.max(-24, (volume - 1) * 24);
    if ((inst as any).volume) {
      (inst as any).volume.value = db;
    }
  }

  /**
   * Play a note with the specified instrument.
   * Adjusted to handle SoundFont players and Tone.js synths.
   */
  async playNote(
    instrumentId: string,
    instrumentType: string,
    pitch: string,
    when: number,
    duration: number,
    volume = 1
  ) {
    const inst = await this.getOrCreateVoice(instrumentId, instrumentType);

    const time = Tone.now() + Math.max(0, when);
    const dur = Math.max(0.05, duration);

    // Handle Soundfont player differently
    if ('play' in inst && typeof inst.play === 'function' && !('triggerAttackRelease' in inst)) {
      // This is a Soundfont.Player instance
      // Soundfont player volume is controlled per note via gain parameter
      inst.play(pitch, time, { duration: dur, gain: volume });
      return;
    }

    // For Tone.js synths: set volume on the synth before playing
    // Volume conversion: 0-1 range to dB
    const db = volume <= 0 ? -96 : Math.max(-24, (volume - 1) * 24);
    if ((inst as any).volume) {
      (inst as any).volume.value = db;
    }

    if ('triggerAttackRelease' in inst) {
      (inst as any).triggerAttackRelease(pitch, dur, time);
    } else if ('triggerAttack' in inst && 'triggerRelease' in inst) {
      (inst as any).triggerAttack(pitch, time);
      (inst as any).triggerRelease(time + dur);
    }
  }

  stopAll() {
    Object.values(this.instrumentVoices).forEach(v => {
      try {
        if ('stop' in v) {
          (v as any).stop(); // For SoundFont player
        }
        if ('releaseAll' in v) {
          (v as any).releaseAll(); // For Tone.js synths
        }
        if ('dispose' in v) {
          (v as any).dispose();
        }
      } catch {}
    });
    this.instrumentVoices = {};
  }
}
