import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-instrument-settings-bar',
  standalone: true,
  imports: [FormsModule, CommonModule], // <-- Add FormsModule here
  templateUrl: './instrument-settings-bar.html',
  styleUrl: './instrument-settings-bar.css'
})
export class InstrumentSettingsBar {
  @Input() instruments: any[] = [];
  @Output() openSettings = new EventEmitter<any>();

  handleOpenSettings(inst: any) {
    this.openSettings.emit(inst);
  }
}
