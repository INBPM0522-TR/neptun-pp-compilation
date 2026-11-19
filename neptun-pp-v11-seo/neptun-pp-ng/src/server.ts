import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { siteUrl } from './app/app.constants';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** A Spring Boot backend címe (élesben környezeti változóból) */
const apiUrl = process.env['API_URL'] ?? 'http://localhost:8083';

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * /api/** → Spring Boot. Élesben nincs proxy.conf.json, ezért itt továbbítjuk a kéréseket
 * (a böngészőét és a szerveroldali renderelésé is ide fut be).
 */
app.use('/api', express.raw({ type: '*/*' }), async (req, res, next) => {
  try {
    const response = await fetch(apiUrl + req.originalUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.get('Content-Type') ?? 'application/json',
        Accept: req.get('Accept') ?? '*/*',
        'Accept-Language': req.get('Accept-Language') ?? 'hu',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    });
    res.status(response.status);
    res.type(response.headers.get('Content-Type') ?? 'application/json');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    next(error);
  }
});

/** Dinamikus oldaltérkép a keresőknek: a hallgatólista és minden hallgató adatlapja */
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const students: { neptun: string; updated: string }[] = await (
      await fetch(`${apiUrl}/api/student`)
    ).json();
    const urls = [
      `  <url><loc>${siteUrl}/student</loc></url>`,
      ...students.map(
        (student) =>
          `  <url><loc>${siteUrl}/student/${encodeURIComponent(student.neptun)}</loc>` +
          `<lastmod>${student.updated.substring(0, 10)}</lastmod></url>`,
      ),
    ];
    res
      .type('application/xml')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.join('\n') +
          '\n</urlset>\n',
      );
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
