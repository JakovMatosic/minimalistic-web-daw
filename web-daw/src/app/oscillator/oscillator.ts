import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AudioEngine } from '../audio/audio-engine';

@Component({
  selector: 'app-oscillator',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './oscillator.html',
  styleUrls: ['./oscillator.css'],
})
export class Oscillator {
  frequency = 440;
  waveform: OscillatorType = 'sine';
  isPlaying = false;

  constructor(public audioEngine: AudioEngine) {} // public for template

  toggleOscillator() {
    if (this.isPlaying) {
      this.audioEngine.stopOscillator();
      this.isPlaying = false;
    } else {
      this.audioEngine.startOscillator(this.frequency, this.waveform);
      this.isPlaying = true;
    }
  }

  setFrequency(value: number) {
    this.frequency = value;
    this.audioEngine.setFrequency(value);
  }

  setWaveform(type: OscillatorType) {
    this.waveform = type;
    this.audioEngine.setType(type);
  }
}
