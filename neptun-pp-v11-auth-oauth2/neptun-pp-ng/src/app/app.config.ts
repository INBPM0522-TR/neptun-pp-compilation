import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './_service/auth-interceptor';
import { AuthService } from './_service/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    // az XSRF-védelem (XSRF-TOKEN süti → X-XSRF-TOKEN fejléc) alapból be van kapcsolva
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    // induláskor megkérdezzük a backendtől, be vagyunk-e jelentkezve
    provideAppInitializer(() => inject(AuthService).load()),
  ],
};
