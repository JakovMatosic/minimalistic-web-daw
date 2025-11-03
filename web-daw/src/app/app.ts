import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PianoRoll } from './piano-roll/piano-roll';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PianoRoll], // import your child component
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('web-daw');
}
