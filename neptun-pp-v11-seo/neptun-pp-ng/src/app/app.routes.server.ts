import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // üres űrlap: a keresőnek nem érdekes, maradhat kliensoldali (mint eddig)
  {
    path: 'student/create',
    renderMode: RenderMode.Client,
  },
  // minden más: minden kérésre a szerveren renderelünk (az adatok folyamatosan változnak)
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
