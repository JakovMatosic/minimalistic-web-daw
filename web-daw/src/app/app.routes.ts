import { Routes } from '@angular/router';
import { Song } from './song/song';

export const routes: Routes = [
  { path: '', component: Song },
  { path: 'song', component: Song }
];