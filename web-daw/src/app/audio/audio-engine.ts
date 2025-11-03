import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioEngine {
  private context = new AudioContext();
  private gainNode = this.context.createGain();

  constructor() {
    this.gainNode.connect(this.context.destination);
  }
}
