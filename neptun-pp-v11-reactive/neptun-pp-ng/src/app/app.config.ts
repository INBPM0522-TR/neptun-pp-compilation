import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // nincs zone.js: a változásokat a signalok (és a sablon eseményei) jelzik
    provideZonelessChangeDetection(),
    provideHttpClient(),
    // a route paraméterei (pl. :neptun) a komponens input()-jaiba kerülnek
    provideRouter(routes, withComponentInputBinding()),
  ],
};
