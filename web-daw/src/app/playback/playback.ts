import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-playback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playback.html',
  styleUrls: ['./playback.css']
})
export class Playback {
  @Input() bpm: number = 120;
  @Input() isPlaying: boolean = false;
  @Output() bpmChange = new EventEmitter<number>();
  @Output() togglePlay = new EventEmitter<void>();

  onBpmChange() {
    this.bpmChange.emit(this.bpm);
  }

  onTogglePlay() {
    this.togglePlay.emit();
  }
}
