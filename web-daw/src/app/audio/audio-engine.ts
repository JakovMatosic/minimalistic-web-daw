import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioEngine {
  private context = new AudioContext();
  private oscillator?: OscillatorNode;
  private gainNode = this.context.createGain();

  constructor() {
    this.gainNode.connect(this.context.destination);
  }

  startOscillator(frequency: number = 440, type: OscillatorType = 'sine') {
    if (this.oscillator) {
      this.oscillator.stop();
    }
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = type;
    this.oscillator.frequency.value = frequency;
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();
  }

  stopOscillator() {
    this.oscillator?.stop();
    this.oscillator = undefined;
  }

  setFrequency(freq: number) {
    if (this.oscillator) {
      this.oscillator.frequency.value = freq;
    }
  }

  setType(type: OscillatorType) {
    if (this.oscillator) {
      this.oscillator.type = type;
    }
  }
}
