import { Injectable } from '@angular/core';
import * as Tone from 'tone';

@Injectable({ providedIn: 'root' })
export class AudioEngine {
  private activeSynths: Tone.Synth[] = [];

  async ensureStarted() {
    // resumes audio context / asks user gesture if needed
    await Tone.start();
  }

  now() {
    return Tone.now();
  }

  // play a simple synth note (pitch e.g. "C4"), when = seconds from now (relative), duration in seconds
  playNote(pitch: string, when: number, duration: number, volume = 1) {
    const synth = new Tone.Synth().toDestination();
    // map volume 0..1 to dB roughly
    synth.volume.value = (volume <= 0) ? -96 : (Math.max(-24, (volume - 1) * 24));
    const startAt = Tone.now() + Math.max(0, when);
    synth.triggerAttackRelease(pitch, duration, startAt);
    this.activeSynths.push(synth);

    // cleanup after the note ends
    const cleanupMs = Math.max(100, (when + duration + 0.1) * 1000);
    setTimeout(() => {
      try { synth.dispose(); } catch {}
      this.activeSynths = this.activeSynths.filter(s => s !== synth);
    }, cleanupMs);
  }

  stopAll() {
    this.activeSynths.forEach(s => {
      try { s.dispose(); } catch {}
    });
    this.activeSynths = [];
  }
}
