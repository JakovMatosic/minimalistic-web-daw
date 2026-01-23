import { Injectable } from '@angular/core';
import * as Tone from 'tone';
import Soundfont, { InstrumentName } from 'soundfont-player';

type AnyVoice = Tone.FMSynth | Tone.PolySynth | Tone.Sampler | Soundfont.Player;
type VoiceWrapper = {
  voice: AnyVoice;
  kind: 'soundfont' | 'tone';
  instrumentType?: string; // Store type so we can recreate after disposal
};

const SOUNDFONT_MAP: Record<string, InstrumentName> = {
  piano: 'acoustic_grand_piano',
  ep: 'electric_piano_1',
  bass: 'lead_8_bass__lead',
  guitar: 'acoustic_guitar_nylon',
  strings: 'string_ensemble_1'
};

const INSTRUMENT_GAIN_CORRECTION: Record<string, number> = {
  bass: 7,     // Up a lot
  guitar: 1.6,   // Up a medium amount
  piano: 2.3,    // Up a little
  ep: 2.6,       // Up a little
  synth: 0.7,   // Down a little
  drum: 0.7,     // Down a little
  pad: 1,      // Down a little
};

@Injectable({ providedIn: 'root' })
export class AudioEngine {
  private started = false;
  private stopTime: number = 0; // Timestamp when stop was called
  private currentPlaybackId: number = 0; // Increment on each play to invalidate old scheduled notes

  // Store Tone.js and SoundFont players per instrument id
  instrumentVoices: Record<string, VoiceWrapper> = {};

  // Drum samples (keep as fallback)
  private drumSamples = {
    C3: 'kick.wav',
    D3: 'snare.wav',
    E3: 'hihat.wav'
  };

  constructor() {
    // Suppress AudioContext warnings by ensuring Tone.js uses a suspended context
    // until user interaction. Tone.js creates contexts automatically on import,
    // but we'll only resume them after ensureStarted() is called (which happens
    // after user interaction in play()).
    try {
      const context = Tone.getContext();
      // If the context was auto-created and is suspended, that's fine - we'll resume it later
      // If it's running, we can't change that, but it shouldn't cause issues
    } catch (e) {
      // Context might not exist yet, which is also fine
    }
  }

  async ensureStarted() {
    if (!this.started) {
      // Resume the AudioContext if it's suspended (which it will be until user interaction)
      const context = Tone.getContext();
      if (context.state === 'suspended') {
        await context.resume();
      }
      // Tone.start() ensures the context is running - this is sufficient
      await Tone.start();

      this.started = true;

      // Now that context is started, preload any instruments that were added before
      // This happens in the background and doesn't block
      this.preloadPendingInstruments();
    }
  }

  private pendingInstruments: Array<{ id: string; type: string }> = [];

  /**
   * Preload instruments that were added before AudioContext was ready.
   */
  private async preloadPendingInstruments() {
    if (this.pendingInstruments.length === 0) return;

    const toPreload = [...this.pendingInstruments];
    this.pendingInstruments = [];

    // Preload in background without blocking
    Promise.all(
      toPreload.map(inst =>
        this.getOrCreateVoice(inst.id, inst.type).catch(() => {
          // If it fails, add back to pending
          this.pendingInstruments.push(inst);
        })
      )
    ).catch(() => {
      // Ignore errors - will retry on play
    });
  }

  /**
   * Preload a single instrument in the background.
   * This can be called when an instrument is created to start loading early.
   */
  async preloadInstrument(id: string, type: string): Promise<void> {
    try {
      // If context is already started, preload immediately
      if (this.started) {
        await this.getOrCreateVoice(id, type);
      } else {
        // Store for later preloading when context starts
        // Check if already in pending list
        if (!this.pendingInstruments.find(p => p.id === id)) {
          this.pendingInstruments.push({ id, type });
        }

        // Try to start AudioContext (non-blocking)
        // This will work if there's been a user interaction
        this.ensureStarted().catch(() => {
          // If it fails (no user interaction yet), that's okay
          // It will be started properly when user clicks play
        });
      }
    } catch (e) {
      // Silently fail - instrument will be loaded when play() is called
      console.debug('Background preload failed (will retry on play):', e);
    }
  }

  now() {
    return Tone.now();
  }

  /**
   * Get or create an instrument voice.
   * For some instruments, load SoundFont instead of Tone synth.
   * Note: ensureStarted() should be called before this method to avoid AudioContext warnings.
   */
  async getOrCreateVoice(
    id: string,
    instrumentType: string
  ): Promise<AnyVoice> {
    if (this.instrumentVoices[id]) {
      return this.instrumentVoices[id].voice;
    }

    await this.ensureStarted();

    let inst: AnyVoice;

    if (instrumentType in SOUNDFONT_MAP) {
      const audioContext = Tone.getContext().rawContext as AudioContext;

      inst = await Soundfont.instrument(
        audioContext,
        SOUNDFONT_MAP[instrumentType]
      );

      const kind = (inst as any).play && (inst as any).stop && !('triggerAttackRelease' in inst) ? 'soundfont' : 'tone';

      this.instrumentVoices[id] = { voice: inst, kind, instrumentType };
      return inst;
    }

    switch (instrumentType) {
      case 'pad':
        inst = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.5, release: 1.5 }
        }).toDestination();
        break;


      case 'drum':
        inst = new Tone.Sampler({
          urls: this.drumSamples,
          baseUrl: 'assets/drums/'
        }).toDestination();
        await (inst as Tone.Sampler).loaded;
        break;

      case 'synth':
      default:
        inst = new Tone.PolySynth(Tone.Synth).toDestination();
        break;
    }

    const kind = (inst as any).play && (inst as any).stop && !('triggerAttackRelease' in inst) ? 'soundfont' : 'tone';

    this.instrumentVoices[id] = { voice: inst, kind, instrumentType };
    return inst;
  }



  /**
   * Pre-create all instrument voices for the given instruments.
   * This should be called before scheduling notes to avoid delays.
   * Ensures all instruments are fully loaded and ready to play.
   * Optimized to skip already-loaded instruments.
   */
  async preloadInstruments(instruments: Array<{ id: string; type: string }>) {
    // Filter out instruments that are already loaded
    const toLoad = instruments.filter(inst => !this.instrumentVoices[inst.id]);

    if (toLoad.length === 0) {
      // All instruments already loaded - return immediately
      return;
    }

    // Only load instruments that aren't already loaded
    const promises = toLoad.map(inst =>
      this.getOrCreateVoice(inst.id, inst.type)
    );
    await Promise.all(promises);

    // Wait for Samplers that were just loaded
    const samplerPromises: Promise<void>[] = [];
    for (const inst of toLoad) {
      const voice = this.instrumentVoices[inst.id];
      if (voice instanceof Tone.Sampler) {
        const loadedPromise = (voice as any).loaded as unknown;
        if (loadedPromise && typeof (loadedPromise as any).then === 'function') {
          samplerPromises.push((loadedPromise as Promise<void>).then(() => { }));
        }
      }
    }
    if (samplerPromises.length > 0) {
      await Promise.all(samplerPromises);
    }
  }

  updateVolume(instrumentId: string, volume: number) {
    const entry = this.instrumentVoices[instrumentId];
    if (!entry) return;

    // DO NOT apply correction to velocity — only to instrument loudness
    const multiplier =
      INSTRUMENT_GAIN_CORRECTION[entry.instrumentType || ''] ?? 1.0;

    // Clamp UI volume to a sane range
    const v = Math.max(0, volume);

    // Apply correction here and ONLY here
    const corrected = v * multiplier;

    // Convert linear gain → decibels
    // -60 dB is effectively silent but stable
    const db = corrected === 0
      ? -60
      : 20 * Math.log10(corrected);

    // SoundFont instruments cannot be controlled here
    if (entry.kind === 'soundfont') return;

    const inst = entry.voice as any;

    if (inst.volume && typeof inst.volume.rampTo === 'function') {
      inst.volume.rampTo(db, 0.1);
    }
  }


  /**
   * Reset the stop timestamp and start a new playback session.
   * Call this when starting a new playback.
   */
  resetStopTime() {
    this.stopTime = 0;
    this.currentPlaybackId++;
  }

  /**
   * Get the current playback ID. Notes scheduled with this ID are valid.
   */
  getCurrentPlaybackId(): number {
    return this.currentPlaybackId;
  }

  playNote(
    instrumentId: string,
    pitchOrFreq: string | number,
    when: number,
    duration: number,
    volume = 1
  ) {
    if (this.stopTime > 0 && when >= this.stopTime) return;

    const entry = this.instrumentVoices[instrumentId];
    if (!entry) return;

    const multiplier = INSTRUMENT_GAIN_CORRECTION[entry.instrumentType || ''] || 1.0;
    const adjustedVolume = volume * multiplier;

    const inst = entry.voice;
    const dur = duration < 0.05 ? 0.05 : duration;

    if (entry.kind === 'soundfont') {
      (inst as any).play(pitchOrFreq as string, when, {
        duration: dur,
        gain: adjustedVolume
      });
      return;
    }

    (inst as any).triggerAttackRelease(pitchOrFreq as number, dur, when, volume);
  }

  async stopAll(disposeSynths = false) {
    // Set stop timestamp to prevent future scheduled notes from playing
    // Only set stopTime if we're actually stopping (not disposing to start new playback)
    if (!disposeSynths) {
      this.stopTime = Tone.now();
    }

    // Stop all currently sounding voices
    const instrumentIds = Object.keys(this.instrumentVoices);
    const toRecreate: Array<{ id: string; type: string }> = [];

    for (const id of instrumentIds) {
      const wrapper = this.instrumentVoices[id];
      if (!wrapper) continue;

      try {
        const voice = wrapper.voice;

        // For Tone.js synths
        if (wrapper.kind === 'tone') {
          // Always release currently playing notes
          if ('releaseAll' in voice && typeof (voice as any).releaseAll === 'function') {
            (voice as any).releaseAll();
          }

          // Only dispose if explicitly requested (when actually stopping, not when starting new playback)
          if (disposeSynths) {
            // Dispose the synth to cancel all scheduled future events
            if ('dispose' in voice && typeof (voice as any).dispose === 'function') {
              (voice as any).dispose();
            }
            // Store info to recreate later
            if (wrapper.instrumentType) {
              toRecreate.push({ id, type: wrapper.instrumentType });
            }
            // Remove from cache - it will be recreated
            delete this.instrumentVoices[id];
          }
        }

        // For SoundFont players
        if (wrapper.kind === 'soundfont') {
          if ('stop' in voice && typeof (voice as any).stop === 'function') {
            (voice as any).stop();
          }
          // SoundFont players don't need disposal, just stop
        }
      } catch (e) {
        // Ignore errors
        if (disposeSynths) {
          delete this.instrumentVoices[id];
        }
      }
    }

    // Recreate disposed synths synchronously so they're ready immediately
    if (disposeSynths && toRecreate.length > 0) {
      await this.preloadInstruments(toRecreate);
    }
  }
}
