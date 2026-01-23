import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Easy to add more drums here later
export const DRUM_CONFIG = [
  { pitch: 'E3', name: 'Hi-Hat', color: '#facc15' }, // Yellow
  { pitch: 'D3', name: 'Snare', color: '#60a5fa' },  // Blue
  { pitch: 'C3', name: 'Kick', color: '#f87171' }    // Red
];

@Component({
  selector: 'app-drum-roll',
  imports: [CommonModule],
  templateUrl: './drum-roll.html',
  styleUrl: './drum-roll.css'
})
export class DrumRoll {
  @Input() track!: { notes: any[] };
  @Output() trackChange = new EventEmitter<void>(); // Notify Song to save

  drums = DRUM_CONFIG;
  quarterSteps = 64; // Total resolution

  // FIX: This solves the TypeScript error
  getDrumColor(pitch: string): string {
    return this.drums.find(d => d.pitch === pitch)?.color || '#94a3b8';
  }

  /**
   * Toggle a drum hit on/off at the clicked position.
   */
  handleGridClick(event: MouseEvent) {
    const grid = (event.currentTarget as HTMLElement);
    const rect = grid.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;

    const drumIndex = Math.floor((relY / rect.height) * this.drums.length);
    const drum = this.drums[drumIndex];

    // Snap to the 16th note (step)
    const step = Math.floor((relX / rect.width) * this.quarterSteps);

    // FIND & DELETE logic
    const existingIndex = this.track.notes.findIndex(
      n => n.pitch === drum.pitch && Math.abs(n.start - step) < 1
    );

    if (existingIndex !== -1) {
      // If it exists, remove it (This is your "how to delete" fix)
      this.track.notes.splice(existingIndex, 1);
    } else {
      // If it's new, add it as a "Trigger" (duration 1)
      this.track.notes.push({
        pitch: drum.pitch,
        start: step,
        duration: 1
      });
    }
    this.trackChange.emit();
  }

  // Call this in ngOnInit to fix the "thick" notes you already saved
  sanitizeNotes() {
    this.track.notes.forEach(n => n.duration = 1);
  }

  ngOnInit() {
    this.sanitizeNotes();
  }

  // Positioning helpers
  getNoteTop(pitch: string): string {
    const index = this.drums.findIndex(d => d.pitch === pitch);
    return `${(index / this.drums.length) * 100}%`;
  }

  getNoteHeight(): string {
    return `${(1 / this.drums.length) * 100}%`;
  }
}