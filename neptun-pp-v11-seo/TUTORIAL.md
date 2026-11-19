# Neptun++ v11-seo – óraterv: szerveroldali renderelés (SSR) és keresőoptimalizálás (50 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-seo`). A backendhez nem nyúlunk.

**Az óra célja:**

* megérteni, miért „láthatatlan” egy SPA a keresők és a linkmegosztók számára, és hogyan segít
  ezen az **SSR** (Server-Side Rendering) és a **hydration**;
* az Angular SSR bekapcsolása (`ng add @angular/ssr`), a renderelési módok (Server, Client,
  Prerender);
* **SEO**: oldalankénti `<title>`, `description`, kanonikus URL, Open Graph, `robots`,
  valódi 404-es státuszkód, `robots.txt` és dinamikus `sitemap.xml`.

| # | Téma | Idő |
|---|---|---|
| 1 | Mi a baj egy SPA-val? SSR, hydration | 5' |
| 2 | `ng add @angular/ssr`, renderelési módok | 10' |
| 3 | A Node szerver: `/api` továbbítás, `sitemap.xml` | 10' |
| 4 | Cím és meta tagek: `TitleStrategy`, `Meta`, kanonikus URL | 15' |
| 5 | Valódi 404, `robots.txt`, ellenőrzés | 10' |
| | **Összesen** | **50'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

---

## 1. Mi a baj egy SPA-val? (5')

Nézd meg a v10 oldal forrását (Ctrl+U, nem a fejlesztői eszközök Elements fülét!):

```html
<body>
  <app-root></app-root>
  <script src="main-XXXX.js" type="module"></script>
</body>
```

A HTML-ben **nincs tartalom**: a hallgatólistát a böngésző rakja össze a JavaScript
lefuttatása és a `/api/student` válasza után. Ennek következményei:

* a **keresők** egy része egyáltalán nem futtat JavaScriptet; a Google futtat, de késleltetve
  és korlátozottan, ezért a tartalom később vagy rosszabbul kerül be a találatok közé;
* a **linkelőnézetek** (Messenger, Slack, LinkedIn, Discord) **soha** nem futtatnak JS-t: a
  `<title>` és az Open Graph tagek nélkül csak egy csupasz URL látszik;
* az **első megjelenítés lassú** (First Contentful Paint): előbb a JS-nek le kell töltődnie és
  le kell futnia, és csak utána indul az adatlekérés.

**SSR:** a szerver (egy Node.js folyamat) **ugyanazt az Angular alkalmazást** lefuttatja a
kérésre, megvárja a HTTP-kéréseket, és a kész HTML-t küldi vissza. **Hydration:** a böngésző
megkapja a kész HTML-t (azonnal látszik), betölti a JS-t, és az Angular **nem rajzolja újra**
a DOM-ot, hanem „átveszi” a meglévőt (rákapcsolja az eseménykezelőket).

```
Böngésző ──GET /student──▶ Node (Angular SSR) ──GET /api/student──▶ Spring Boot
         ◀──kész HTML + szerializált HTTP-válaszok──┘
   (azonnal látszik) → main.js betölt → hydration (nincs újabb /api/student kérés)
```

---

## 2. `ng add @angular/ssr`, renderelési módok (10')

```bash
cd neptun-pp-ng
ng add @angular/ssr
```

Ez a parancs:

| Fájl | Mit csinál |
|---|---|
| `package.json` | `@angular/ssr`, `@angular/platform-server`, `express` függőség |
| `angular.json` | `"server": "src/main.server.ts"`, `"outputMode": "server"`, `"ssr": { "entry": "src/server.ts" }` |
| `src/main.server.ts` | a szerveroldali belépési pont (a `main.ts` párja) |
| `src/app/app.config.server.ts` | a szerveroldali providerek (`provideServerRendering`) |
| `src/app/app.routes.server.ts` | útvonalanként a renderelési mód |
| `src/server.ts` | egy Express szerver, ami kiszolgálja a statikus fájlokat és renderel |
| `src/app/app.config.ts` | `provideClientHydration()` |

Az `ng serve` ettől kezdve fejlesztés közben is szerveroldalon renderel, az `ng build`
pedig két részt készít: `dist/neptun-pp-ng/browser` (a statikus fájlok) és
`dist/neptun-pp-ng/server` (a Node szerver).

### 2.1 Engedélyezett hostnevek (SSRF-védelem)

A szerveroldali renderelés a bejövő kérés `Host` fejlécéből rakja össze az oldal címét, és
ehhez képest oldja fel a relatív HTTP-kéréseket (2.4). Egy támadó egy hamis `Host`
fejléccel elérhetné, hogy a szerverünk az ő címére küldjön kéréseket (**SSRF**, Server-Side
Request Forgery). Ezért az Angular csak az `angular.json`-ban felsorolt hostnevekre renderel,
minden másra `400 Bad Request`-et ad (`Header "host" with value "..." is not allowed`).

**Hova:** `neptun-pp-ng/angular.json` – a `build.options.security` részt módosítsd

```json
"security": {
  "allowedHosts": ["localhost"]
},
```

Élesben ide a valódi domain kerül (pl. `"neptun.example.hu"`, vagy `"*.example.hu"`).

### 2.2 Hydration és event replay

* `provideClientHydration()`: a böngésző a szerver által renderelt DOM-ot veszi át.
  Alapból tartalmazza a **HTTP transfer cache**-t is: a szerveren lefutott GET kérések
  válaszai a HTML-be ágyazva jönnek le, így a böngészőben **nem indulnak újra**.
* `withEventReplay()`: ha a felhasználó a JS betöltése előtt kattint (a gomb már látszik!),
  az esemény nem vész el, hydration után „visszajátszódik”.
* `withFetch()`: a `HttpClient` a `fetch` API-t használja; a szerveren (Node) ez a
  természetes, és az Angular SSR is ezt javasolja.

A 4. lépés SEO-beállításai (`TitleStrategy`) is ide kerülnek, ezért a fájl most már a végleges
formájában szerepel.

**Hova:** `neptun-pp-ng/src/app/app.config.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
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
```

### 2.3 Renderelési módok

Útvonalanként eldönthető, hogyan készüljön az oldal:

| Mód | Mikor készül a HTML? | Mire jó? |
|---|---|---|
| `RenderMode.Prerender` (SSG) | **buildeléskor**, egyszer | ritkán változó oldalak (rólunk, súgó) |
| `RenderMode.Server` (SSR) | **minden kérésre** | gyakran változó adatok (hallgatólista, adatlap) |
| `RenderMode.Client` (CSR) | a böngészőben, mint eddig | nem kell a keresőnek (űrlap, admin felület) |

Az `ng add` mindent `Prerender`-re állít, de a mi adataink folyamatosan változnak (és
buildeléskor a backendnek is futnia kellene), ezért `Server` módot használunk. A
létrehozó űrlapnak nincs keresési értéke, az maradhat kliensoldali.

**Hova:** `neptun-pp-ng/src/app/app.routes.server.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
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
```

### 2.4 Relatív URL-ek a szerveren

A komponensek a `HttpClient`-tel relatív címet kérnek le (`/api/student`). A böngészőben ez
a lap címéhez képest értendő; a szerveren az Angular a **bejövő kérés címéhez** képest oldja
fel (`http://localhost:4200/api/student`). Fejlesztés közben ezt a kérést az `ng serve` a
`proxy.conf.json` szerint továbbítja a backendnek; élesben (3. lépés) a saját Express
szerverünknek kell továbbítania.

### 2.5 Csak a böngészőben létező dolgok

A szerveren nincs `window`, `document.cookie`, `localStorage` vagy `alert`. A v10-ben ezek
csak eseménykezelőkben (kattintásra) fordulnak elő, és azok a szerveren nem futnak le, ezért
nem kell hozzájuk nyúlni. Ha mégis kellene, az `afterNextRender()` csak a böngészőben fut,
az `isPlatformBrowser(inject(PLATFORM_ID))` pedig megmondja, hol vagyunk. A Bootstrap JS
(`angular.json` → `scripts`) is csak a böngészőben töltődik be.

Próba: indítsd a backendet, majd `npm start`, és nézd meg újra az oldal forrását: a táblázat
sorai benne vannak a HTML-ben.

---

## 3. A Node szerver: `/api` továbbítás, `sitemap.xml` (10')

Élesben a `ng build` után a `node dist/neptun-pp-ng/server/server.mjs` indul el
(alapból a 4000-es porton). Itt nincs `proxy.conf.json`, ezért:

* az **`/api/**`** kéréseket (a böngészőé és a szerveroldali renderelésé is) nekünk kell
  továbbítani a Spring Boot backendnek. Ehhez a Node beépített `fetch` függvényét használjuk,
  nem kell új csomag; a backend címét az `API_URL` környezeti változó adja meg;
* a **`/sitemap.xml`**-t itt állítjuk elő **dinamikusan**: lekérjük a hallgatókat, és minden
  adatlap címe bekerül. A kereső ebből tudja meg, milyen oldalak vannak (egy SPA-ban a linkeket
  nem mindig tudja „bejárni”).

Az `ng serve` fejlesztés közben is ezt a szervert használja (a `reqHandler`-en át), így a
`http://localhost:4200/sitemap.xml` is működik; az `/api`-t viszont ott a `proxy.conf.json`
kapja el előbb.

**Hova:** `neptun-pp-ng/src/server.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
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
```

A `siteUrl` az oldal **nyilvános címe**: ebből készülnek az abszolút URL-ek (sitemap,
kanonikus URL, Open Graph). Itt a helyi éles szerver címe; egy valódi telepítésnél a domain
(pl. `https://neptun.example.hu`).

**Hova:** `neptun-pp-ng/src/app/app.constants.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
export const datetimeFormat = 'yyyy-MM-dd HH:mm:ss';
export const programs = new Map([
  ['CS_BSC', 'Computer Science BSc'],
  ['CSE_BSC', 'Computer Science Engineering BSc'],
  ['BI_BSC', 'Business Informatics BSc']
]);

/** Az oldal nyilvános címe: sitemap, kanonikus URL, Open Graph (élesben a valódi domain) */
export const siteUrl = 'http://localhost:4000';
```

Próba (éles mód):

```bash
npm run build
node dist/neptun-pp-ng/server/server.mjs     # http://localhost:4000
```

---

## 4. Cím és meta tagek (15')

A keresőtalálatban és a linkelőnézetben ezek látszanak:

| Tag | Mire való? |
|---|---|
| `<title>` | a találat címe, a böngészőfül felirata |
| `<meta name="description">` | a találat alatti 1–2 soros leírás |
| `<link rel="canonical">` | ha ugyanaz a tartalom több címen is elérhető, melyik a „hivatalos” |
| `<meta property="og:title/description/url">` | Open Graph: a linkelőnézet (Facebook, Messenger, LinkedIn, Slack) |
| `<meta name="robots" content="noindex">` | ezt az oldalt ne vegye fel a kereső |

Ezeket SSR nélkül is be lehet állítani, de csak a böngészőben futó JS állítaná be őket: a
linkelőnézetek ezt nem látnák. SSR-rel a szerver által küldött HTML-ben már benne vannak.

### 4.1 A Seo szolgáltatás

Az Angular `Title` és `Meta` szolgáltatása a `<head>`-et módosítja; a szerveren is működnek
(ott a renderelt dokumentumot módosítják). A kanonikus linkhez nincs kész szolgáltatás, ezt a
`DOCUMENT`-en keresztül tesszük be.

```bash
ng generate service _service/seo --skip-tests
```

**Hova:** `neptun-pp-ng/src/app/_service/seo.ts` – **új fájl**

```ts
import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { siteUrl } from '../app.constants';

/**
 * Oldalankénti SEO-adatok: cím, leírás, kanonikus URL, Open Graph, robots.
 * SSR-rel ezek már a szerver által küldött HTML-ben benne vannak.
 */
@Injectable({
  providedIn: 'root',
})
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** "Hallgatók" → <title>Hallgatók – Neptun++</title> és og:title */
  setTitle(title: string): void {
    const fullTitle = `${title} – Neptun++`;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
  }

  /**
   * @param description a találat alatti leírás
   * @param path az oldal kanonikus útvonala, pl. /student/ABC123 (query paraméterek nélkül!)
   * @param index felvehető-e a keresőbe
   */
  update({ description, path, index = true }: { description: string; path: string; index?: boolean }): void {
    const url = siteUrl + path;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: index ? 'index, follow' : 'noindex' });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
```

### 4.2 Cím az útvonalakból: `TitleStrategy`

A route-ok `title` tulajdonsága alapból egy az egyben `<title>` lesz. Egy saját
`TitleStrategy`-vel minden címhez hozzáfűzzük az oldal nevét, és az `og:title`-t is beállítjuk
(a regisztrációja a 2.2-es `app.config.ts`-ben van).

**Hova:** `neptun-pp-ng/src/app/_service/page-title-strategy.ts` – **új fájl**

```ts
import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Seo } from './seo';

/** A route-ok title-jéből: "Hallgatók" → "Hallgatók – Neptun++" (és og:title) */
@Injectable({
  providedIn: 'root',
})
export class PageTitleStrategy extends TitleStrategy {
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) {
      this.seo.setTitle(title);
    }
  }
}
```

**Hova:** `neptun-pp-ng/src/app/app.routes.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';

export const routes: Routes = [
  {
    path: 'student',
    component: StudentList,
    title: 'Hallgatók'
  },
  {
    path: 'student/create',
    component: StudentEdit,
    title: 'Új hallgató'
  },
  {
    path: 'student/:neptun',
    component: StudentEdit,
    // alapérték; a betöltés után a komponens a hallgató nevére cseréli
    title: 'Hallgató'
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
```

### 4.3 Hallgatólista

A leírásba a hallgatók száma is bekerül, és a kanonikus URL mindig `/student`.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { Seo } from '../../_service/seo';
import { DatePipe } from '@angular/common';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { RouterLink } from '@angular/router';
import { EmptyRow } from '../empty-row/empty-row';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, EmptyRow, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly seo = inject(Seo);

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.seo.update({ description: 'A Neptun++ hallgatóinak listája.', path: '/student' });

    this.client.findAll().subscribe((data) => {
      this.students = data;
      // a szerveren ez még a HTML elküldése előtt lefut (az SSR megvárja a HTTP-kérést)
      this.seo.update({
        description: `A Neptun++ ${data.length} hallgatójának listája szakkal és Neptun-kóddal.`,
        path: '/student',
      });
      this.cdr.markForCheck();
    });
  }

  /** v1 (egyirányú) fejlécnek átadott függvény. Arrow function, hogy a `this` megmaradjon! */
  protected readonly order = (value: Student.Key): void => {
    if (this.orderBy === value) {
      this.desc = !this.desc;
    } else {
      this.orderBy = value;
      this.desc = false;
    }
  };

  protected deleteOne(student: Student): void {
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        alert('Success');
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

---

## 5. Valódi 404, `robots.txt`, ellenőrzés (10')

### 5.1 Szerkesztő: dinamikus cím és valódi 404

Az adatlap címe a hallgató neve lesz, a leírásba a szakja kerül. Az új hallgató űrlapja
`noindex`.

**Soft 404:** ha egy nem létező Neptun-kódra a szerver `200 OK`-t ad egy „nincs ilyen” oldallal,
a kereső ezt valódi oldalnak hiheti, és felveheti a találatok közé. Ezért a szerveren a
**HTTP-státuszt is 404-re** állítjuk: a `RESPONSE_INIT` token a szerveren a készülő válasz
beállításait adja (a böngészőben `null`).

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  RESPONSE_INIT,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { Seo } from '../../_service/seo';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ProgramPipe],
  selector: 'app-student-edit',
  styleUrl: './student-edit.scss',
  templateUrl: './student-edit.html',
})
export class StudentEdit implements OnInit {
  private readonly client = inject(StudentClient);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(Seo);
  /** A szerveren a készülő HTTP-válasz beállításai (státuszkód), a böngészőben null */
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  protected student!: Student;
  protected notFound = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const neptun = params.get('neptun');
          return neptun ? this.client.findOne(neptun) : of(Student.empty());
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (student) => {
          this.student = student;
          this.updateSeo();
          this.cdr.markForCheck();
        },
        error: () => {
          this.notFound = true;
          // valódi 404 a keresőnek (különben "soft 404": 200 OK egy hibaoldallal)
          if (this.responseInit) {
            this.responseInit.status = 404;
          }
          this.seo.setTitle('Nincs ilyen hallgató');
          this.seo.update({ description: 'Nincs ilyen hallgató.', path: '/student', index: false });
          this.cdr.markForCheck();
        },
      });
  }

  protected get isNew(): boolean {
    return !this.student.neptun;
  }

  protected save(): void {
    const request = this.isNew
      ? this.client.createOne(this.student)
      : this.client.updateOne(this.student);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (student: Student) => {
        alert('Success');
        if (this.isNew) {
          this.router.navigate(['/student', student.neptun], { replaceUrl: true });
        }
        this.student = student;
        this.updateSeo();
      },
    });
  }

  private updateSeo(): void {
    if (this.isNew) {
      this.seo.update({ description: 'Új hallgató felvétele.', path: '/student/create', index: false });
      return;
    }
    this.seo.setTitle(this.student.name);
    this.seo.update({
      description: `${this.student.name} (${this.student.neptun}), ${programs.get(this.student.program)} hallgató adatlapja.`,
      path: `/student/${this.student.neptun}`,
    });
  }

  protected readonly programs = programs;
}
```

> A nem használt `JsonPipe` import is eltűnt (a build `NG8113` figyelmeztetése).

A sablonba egy „Nincs ilyen hallgató” ág került.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    @if (notFound) {
      <div class="card-body">
        <div class="alert alert-danger m-0">Nincs ilyen hallgató.</div>
      </div>
    }
    <!-- a hallgató aszinkron töltődik be: amíg nincs meg, ne próbáljuk kirajzolni -->
    @if (student) {
      <div class="card-header text-bg-primary">
        {{ isNew ? 'Create Student' : `Edit ${student.name}` }}
      </div>
      <div class="card-body">
        @if (!isNew) {
          <div class="form-floating my-2">
            <input id="neptun" class="form-control"
                   [(ngModel)]="student.neptun"
                   disabled>
            <label for="neptun">Neptun-code</label>
          </div>
        }

        <div class="form-floating my-2">
          <input id="name" class="form-control"
                 [(ngModel)]="student.name">
          <label for="name">Name</label>
        </div>

        <div class="form-floating my-2">
          <select id="program" class="form-select"
                  [(ngModel)]="student.program">
            <option value="" disabled>Choose a program</option>
            @for (program of programs.keys(); track $index) {
              <option [value]="program">{{ program | program }}</option>
            }
          </select>
        </div>

        <button class="btn btn-outline-primary w-100"
                [title]="isNew ? 'Create' : 'Update'"
                (click)="save()">
          <i class="bi" [class.bi-plus-lg]="isNew" [class.bi-floppy]="!isNew"></i>
          <span class="d-none d-md-inline ms-1">{{ isNew ? 'Create' : 'Update' }}</span>
        </button>
      </div>
    }
  </div>
</div>
```

### 5.2 Alapértelmezések az `index.html`-ben

A `lang="hu"` a keresőnek és a felolvasóprogramoknak mondja meg az oldal nyelvét. A
`description` alapérték arra az esetre, ha egy oldal nem állítana be sajátot.

**Hova:** `neptun-pp-ng/src/index.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>Neptun++</title>
  <meta name="description" content="Neptun++: hallgatók, tárgyak és tárgyfelvételek nyilvántartása.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:site_name" content="Neptun++">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <base href="/">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

### 5.3 `robots.txt`

A keresőrobotok először ezt a fájlt kérik le: mit járhatnak be, és hol az oldaltérkép. A
`public` mappa tartalma a gyökérből érhető el.

**Hova:** `neptun-pp-ng/public/robots.txt` – **új fájl**

```
# minden kereső bejárhatja az oldalt, kivéve az üres űrlapot
User-agent: *
Disallow: /student/create

Sitemap: http://localhost:4000/sitemap.xml
```

### 5.4 Ellenőrzés

Indítsd a backendet és az éles SSR szervert (`npm run build`, majd
`node dist/neptun-pp-ng/server/server.mjs`), és nézd meg „kereső szemmel” (JavaScript nélkül):

```bash
curl -s http://localhost:4000/student | grep -E "<title>|description|canonical|og:"
curl -s http://localhost:4000/student/NINCSILYEN -o /dev/null -w "%{http_code}\n"    # 404
curl -s http://localhost:4000/sitemap.xml | head
curl -s http://localhost:4000/robots.txt
```

Böngészőben:

* **Ctrl+U** (oldal forrása): a táblázat és a meta tagek benne vannak;
* a fejlesztői eszközök Network fülén **nincs `/api/student` kérés** az első betöltéskor (HTTP
  transfer cache), csak navigálás után;
* fejlesztői eszközök → Settings → *Disable JavaScript*, frissítés: a lista így is látszik;
* Lighthouse fül → *SEO* kategória.

A linkelőnézet kipróbálásához az oldalnak nyilvánosan elérhetőnek kell lennie (pl. egy
`ngrok http 4000` alagúton keresztül), utána egy Messenger- vagy Slack-üzenetbe beillesztve
látszik a cím és a leírás.

---

## Függelék

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

### Továbblépési lehetőségek

* **strukturált adatok** (JSON-LD, `schema.org`): egy `<script type="application/ld+json">`
  a `<head>`-ben, amiből a Google gazdagabb találatot (rich result) készít;
* **incremental hydration** (`withIncrementalHydration()` + `@defer (hydrate on viewport)`):
  az oldal egyes részei csak akkor hidratálódnak, amikor szükség van rájuk;
* `RenderMode.Prerender` + `getPrerenderParams`: buildeléskor előre legenerált oldalak.

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-seo`) van. A többi v11 változat
ugyanebből a v10-es állapotból indul, egymástól függetlenül.
