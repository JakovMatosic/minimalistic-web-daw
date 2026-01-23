import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';
import { App } from './app/app';
import { bootstrapApplication } from '@angular/platform-browser';


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation())
  ]
};

bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
