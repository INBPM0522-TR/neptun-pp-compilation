# Neptun++ – óratervek és megoldások

A repó egy hallgatónyilvántartó mintaalkalmazás (**Neptun++**) egymásra épülő változatait
tartalmazza. Minden mappa egy óra **végállapota**, és mindegyikben van egy `README.md`
óraterv (lépések, időbeosztás, a kódrészletek helye: **Hova:** sorok).

**Technológiák:** Spring Boot 4.1.2 (JDK 25, H2, Lombok) a `neptun-pp` mappában, és
Angular 22 (Bootstrap, ng-bootstrap) a `neptun-pp-ng` mappában.

## Felépítés

```
neptun-pp-v10                       ← közös kiindulópont
 ├── neptun-pp-v11-ux
 ├── neptun-pp-v11-i18n
 ├── neptun-pp-v11-reactive
 ├── neptun-pp-v11-auth-basic-inmemory
 ├── neptun-pp-v11-auth-oauth2
 ├── neptun-pp-v11-swagger
 ├── neptun-pp-v11-build
 ├── neptun-pp-v11-seo
 └── neptun-pp-v11-thymeleaf
```

A `v11-*` változatok **mind a `v10`-ből indulnak, egymástól függetlenül**, tetszőleges
sorrendben vehetők.

## Áttekintő táblázat

| Mappa | Téma | Idő | Backend | Frontend |
|---|---|---|---|---|
| [`neptun-pp-v10`](neptun-pp-v10/README.md) | navbar, EmptyRow, rendezhető fejlécek | 30' | – | ✔ |
| [`neptun-pp-v11-ux`](neptun-pp-v11-ux/README.md) | `ListCard`, új listák, modalok, hibák megjelenítése | 55' | – | ✔ |
| [`neptun-pp-v11-i18n`](neptun-pp-v11-i18n/README.md) | többnyelvűség (ngx-translate) | 25' | – | ✔ |
| [`neptun-pp-v11-reactive`](neptun-pp-v11-reactive/README.md) | átírás Angular signalokra | 45' | – | ✔ |
| [`neptun-pp-v11-auth-basic-inmemory`](neptun-pp-v11-auth-basic-inmemory/README.md) | HTTP Basic autentikáció | 40' | ✔ | ✔ |
| [`neptun-pp-v11-auth-oauth2`](neptun-pp-v11-auth-oauth2/README.md) | bejelentkezés GitHubbal (OAuth 2.0) | 45' | ✔ | ✔ |
| [`neptun-pp-v11-swagger`](neptun-pp-v11-swagger/README.md) | OpenAPI és Swagger UI | 35' | ✔ | kevés |
| [`neptun-pp-v11-build`](neptun-pp-v11-build/README.md) | frontend és backend egyetlen WAR-ban | 40' | ✔ | kevés |
| [`neptun-pp-v11-seo`](neptun-pp-v11-seo/README.md) | Angular SSR és keresőoptimalizálás | 50' | – | ✔ |
| [`neptun-pp-v11-thymeleaf`](neptun-pp-v11-thymeleaf/README.md) | szerveroldali renderelés Thymeleaffel | 50' | ✔ | nincs Angular |

## A projektek röviden

### `neptun-pp-v10` – navbar, EmptyRow, rendezhető fejlécek (30')

A `neptun-pp-v9-start` starterből indul. A backend már kész: hallgató-, tárgy- és
tárgyfelvétel-végpontok (`/api/student`, `/api/subject`, `/api/enrollment`), validáció,
egységes `ProblemDetail` hibaválaszok, az `Accept-Language` szerinti hibaüzenetek. Az órán
csak a frontend változik:

* navbar `routerLinkActive`-val, reszponzív gombokkal;
* `EmptyRow` komponens a „nincs adat” sorhoz;
* rendezhető táblázatfejlécek három változatban (`sortable-th` v1, v2, v3).

### `neptun-pp-v11-ux` – újrafelhasználható lista, modalok, hibák (55')

Csak frontend:

* a hallgatólista kártyájából `ng-template`-ekkel paraméterezhető `ListCard` lesz;
* erre épül az új `SubjectList` és `EnrollmentList`;
* modalok: a hagyományos Bootstrap modal (rejtett gombbal) és az ng-bootstrap `NgbModal`;
* a backend hibái és validációs üzenetei `alert()` helyett egy `ErrorAlert` komponensben
  jelennek meg.

### `neptun-pp-v11-i18n` – többnyelvűség (25')

Csak frontend. Magyar és angol felület **ngx-translate**-tel (futásidejű JSON szótárak,
nyelvváltás újratöltés nélkül). Van nyelvváltó a navbaron, és egy interceptor beállítja az
`Accept-Language` fejlécet, így a backend validációs üzenetei is a választott nyelven jönnek.

### `neptun-pp-v11-reactive` – Angular signalok (45')

Csak frontend. Ugyanaz a működés klasszikus Angular helyett signalokkal:

* zoneless működés és `OnPush`;
* `input()` / `model()` az `@Input` / `@Output` helyett;
* `signal()`, `computed()`, `rxResource()` a `subscribe` + `markForCheck` helyett;
* route paraméter `input()`-ként (`withComponentInputBinding`), `linkedSignal`;
* **Signal Forms** (`form()`, `[formField]`) az `ngModel` helyett.

### `neptun-pp-v11-auth-basic-inmemory` – HTTP Basic (40')

* Backend: **Spring Security**, minden útvonal védett (`/api/**` és a `/db` H2 konzol is).
  A felhasználók a memóriában vannak (`InMemoryUserDetailsManager`): `user` / `user` és
  `admin` / `admin`. Törölni csak az `ADMIN` szerepkörrel lehet, a többiek 403-at kapnak.
* Frontend: `AuthService`, interceptor (`Authorization` fejléc), route guard, bejelentkező
  oldal, kijelentkezés.

### `neptun-pp-v11-auth-oauth2` – bejelentkezés GitHubbal (45')

* Az authorization code flow működése, és egy OAuth alkalmazás regisztrálása a GitHubon.
* Backend: `oauth2Login()`, session süti, CSRF-védelem. A GitHub-alkalmazás adatait a
  `GITHUB_CLIENT_ID` és `GITHUB_CLIENT_SECRET` környezeti változókból olvassa, ezek nélkül
  a backend el sem indul.
* Frontend: az OAuth útvonalakat is a proxy viszi át, és van `AuthService`, guard,
  bejelentkező oldal.

### `neptun-pp-v11-swagger` – OpenAPI és Swagger UI (35')

* A **springdoc-openapi** a Spring annotációkból maga előállítja az API leírását.
* Ezt az `OpenAPI` bean, valamint a `@Tag`, `@Operation`, `@ApiResponse`, `@Parameter` és
  `@Schema` annotációk egészítik ki magyar leírásokkal, példákkal és hibakódokkal.
* A Swagger UI a `http://localhost:8083/swagger-ui/index.html` címen érhető el, a frontend
  navbarjából pedig a proxyn keresztül.

### `neptun-pp-v11-build` – egyetlen deployolható WAR (40')

* A WAR egy külső Tomcatre deployolható, vagy elindítható `java -jar neptun-pp.war`-ral.
  Benne van a lebuildelt Angular alkalmazás is.
* Backend: WAR csomagolás, `SpringBootServletInitializer`, `/neptun-pp` context path, és az
  SPA útvonalak is az `index.html`-re mennek.
* Frontend: relatív API-címek.
* `mvn package -PbuildNg`: a `frontend-maven-plugin` lebuildeli az Angular projektet
  (a Node.js-t is letölti), és bemásolja a `static` mappába.

### `neptun-pp-v11-seo` – SSR és keresőoptimalizálás (50')

Csak frontend:

* miért „láthatatlan” egy SPA a keresőknek, és hogyan segít az SSR és a hydration;
* `ng add @angular/ssr` és a renderelési módok (Server, Client, Prerender);
* a Node szerver (`localhost:4000`) továbbítja az `/api` kéréseket, és dinamikus
  `sitemap.xml`-t ad;
* oldalanként `<title>`, `description`, kanonikus URL, Open Graph és `robots` meta tagek
  (`TitleStrategy`, `Meta`);
* valódi 404-es státuszkód és `robots.txt`.

### `neptun-pp-v11-thymeleaf` – szerveroldali renderelés Thymeleaffel (50')

**Nincs Angular frontend:** ugyanazt a felületet a Spring Boot backend állítja elő
Thymeleaf sablonokkal. Ide tartozik a navbar, a rendezhető lista (a rendezés az URL-ben van,
pl. `/student?orderBy=name&desc=true`), a „nincs adat” sor, a létrehozás és a szerkesztés
(`@Valid` + `BindingResult`, PRG minta), a törlés és a hibaoldal. Az újrafelhasználható
elemek fragmentek. A README részletesen összeveti a két megközelítést (SPA és SSR).

## Futtatás

Általában (a pontos lépések az egyes README-k végén, a **Függelék**ben vannak):

```bash
cd <mappa>/neptun-pp    && mvn spring-boot:run           # backend: http://localhost:8083
cd <mappa>/neptun-pp-ng && npm install && npm start      # frontend: http://localhost:4200
```

A fejlesztői szerveren a frontend a `proxy.conf.json` szerint továbbítja a backend felé az
`/api` kéréseket. Néhány változat ettől eltér:

| Mappa | Eltérés |
|---|---|
| `v11-thymeleaf` | csak a backend fut: `http://localhost:8083/student` |
| `v11-build` | `mvn package -PbuildNg`, utána `java -jar target/neptun-pp.war` → `http://localhost:8083/neptun-pp/` |
| `v11-seo` | az SSR build után: `node dist/neptun-pp-ng/server/server.mjs` → `http://localhost:4000` |
| `v11-auth-oauth2` | indítás előtt be kell állítani a `GITHUB_CLIENT_ID` és `GITHUB_CLIENT_SECRET` változókat |
