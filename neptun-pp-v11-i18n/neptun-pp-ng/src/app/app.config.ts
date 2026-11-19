import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { acceptLanguageInterceptor } from './_service/accept-language-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
    provideRouter(routes),
    // i18n: a fordítások a public/i18n/hu.json és en.json fájlokból jönnek
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        // a JSON-ök letöltése ne menjen át az interceptoron (különben körkörös függés lenne)
        useHttpBackend: true,
      }),
      fallbackLang: 'hu',
      lang: 'hu',
    }),
  ],
};
