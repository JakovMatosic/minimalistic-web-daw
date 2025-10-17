import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Oscillator } from './oscillator/oscillator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Oscillator], // import your child component
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('web-daw');
}
