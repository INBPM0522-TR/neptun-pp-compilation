import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { PageTitleStrategy } from './_service/page-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // fetch API: a szerveren (Node) is természetes
    provideHttpClient(withFetch()),
    provideRouter(routes),
    // SSR: a böngésző átveszi a szerver által renderelt DOM-ot; a betöltés előtti kattintások
    // sem vesznek el. A szerveren lefutott GET kérések válaszát nem kéri le újra.
    provideClientHydration(withEventReplay()),
    // oldalcím: "Hallgatók – Neptun++" (lásd 4. lépés)
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
