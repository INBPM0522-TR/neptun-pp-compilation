# Neptun++ v11-auth-oauth2 – óraterv: bejelentkezés GitHubbal (OAuth 2.0) (45 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-auth-oauth2`).

**Az óra célja:**

* **OAuth 2.0 / „Bejelentkezés GitHubbal”**: a jelszót sem a frontend, sem a backend nem
  látja, azt csak a GitHub kezeli;
* az órán közösen **regisztrálunk egy OAuth alkalmazást a GitHubon**, és bekötjük a
  Spring Security `oauth2Login()`-jába;
* a backend **összes útvonala** védett; a bejelentkezés **session sütivel** marad meg,
  ezért **CSRF-védelem** is kell (amit az Angular magától kezel);
* a frontend továbbra is a `proxy.conf.json`-on keresztül éri el a backendet; most az OAuth
  útvonalait is a proxy viszi át, így a böngésző szemszögéből minden a `localhost:4200`-on fut.

| # | Téma | Idő |
|---|---|---|
| 1 | Hogyan működik az OAuth 2.0 (authorization code flow)? | 5' |
| 2 | OAuth alkalmazás regisztrálása a GitHubon | 10' |
| 3 | Backend: Spring Security `oauth2Login` | 15' |
| 4 | Frontend: proxy, AuthService, guard, bejelentkező oldal | 15' |
| | **Összesen** | **45'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

---

## 1. Hogyan működik az OAuth 2.0? (5')

Szereplők: a **felhasználó** (böngésző), a **kliens** (a mi Spring Boot backendünk), és az
**authorization server** (GitHub). A kliens a GitHubnál előre regisztrált, kapott egy
**client id**-t (nyilvános) és egy **client secret**-et (titkos, csak a backend ismeri).

```
Böngésző                     Angular dev szerver (4200) → Spring Boot (8083)            GitHub
   │ 1. "Bejelentkezés GitHubbal" → GET /oauth2/authorization/github
   │ ─────────────────────────────────────────────▶ │
   │ 2. 302 → https://github.com/login/oauth/authorize?client_id=...&state=...&redirect_uri=...
   │ ◀───────────────────────────────────────────── │
   │ 3. bejelentkezés + engedélyezés a GitHubon (a jelszót csak a GitHub látja!)          │
   │ ────────────────────────────────────────────────────────────────────────────────────▶│
   │ 4. 302 → http://localhost:4200/login/oauth2/code/github?code=...&state=...            │
   │ ◀────────────────────────────────────────────────────────────────────────────────────│
   │ 5. GET /login/oauth2/code/github?code=...  ──▶ │ 6. code + client secret → access token ──▶ │
   │                                                │ 7. access token → GET https://api.github.com/user
   │ 8. Set-Cookie: JSESSIONID; 302 → http://localhost:4200/                              │
   │ ◀───────────────────────────────────────────── │
   │ 9. minden további /api kérés a session sütivel megy
```

* A böngésző csak egy rövid életű **code**-ot lát; ezt a backend a **client secrettel**
  együtt cseréli **access tokenre** (6.), közvetlenül a GitHubbal beszélve.
* A `state` paraméter véletlen érték, amit a backend a sessionben eltárol, és a
  visszatéréskor (5.) ellenőriz: így egy támadó nem tud a saját `code`-jával „becsempészni”
  minket a saját fiókjába.
* A Spring Security 7 ezen felül **PKCE**-t is használ (a 2. lépés URL-jében látszik a
  `code_challenge`): a backend egy véletlen titok hash-ét küldi el előre, és a 6. lépésben
  magát a titkot; így egy ellopott `code` önmagában nem váltható be.
* A bejelentkezés eredménye egy szerveroldali **session**, amit a `JSESSIONID` süti azonosít.
  Mivel a böngésző ezt **minden** kéréshez automatikusan csatolja (akár egy idegen oldalról
  indított kéréshez is), **CSRF-védelem kell**: a módosító kérésekben egy olyan tokennek is
  szerepelnie kell, amit csak a saját oldalunk JavaScriptje tud kiolvasni (lásd 3.3).

> Összehasonlítás a `v11-auth-basic-inmemory`-val: ott a jelszó minden kérésben elment, és
> a frontend tárolta; itt a jelszót csak a GitHub látja, a frontend pedig csak egy sütit kap,
> amit JavaScriptből ki sem tud olvasni (`HttpOnly`).

---

## 2. OAuth alkalmazás regisztrálása a GitHubon (10')

Ezt **mindenki a saját GitHub fiókjában** csinálja meg (ingyenes, bármelyik fiókkal megy).

1. GitHub → jobb felső sarok, profilkép → **Settings** → bal oldalt legalul
   **Developer settings** → **OAuth Apps** → **New OAuth App**
   (közvetlen link: <https://github.com/settings/applications/new>).
2. Töltsd ki:

   | Mező | Érték |
   |---|---|
   | Application name | `Neptun++ (fejlesztői)` (bármi lehet, a bejelentkezéskor ezt látod) |
   | Homepage URL | `http://localhost:4200` |
   | Application description | (üresen hagyható) |
   | Authorization callback URL | `http://localhost:4200/login/oauth2/code/github` |
   | Enable Device Flow | **ne** pipáld be |

3. **Register application**.
4. A megjelenő oldalon a **Client ID** látszik; másold ki.
5. **Generate a new client secret** → a secret **csak most** látszik, rögtön másold ki.
   (Ha elveszett, generálj újat, a régit töröld.)

> **A client secret titok!** Ne kerüljön a forráskódba, a `application.yml`-be vagy a gitbe.
> Környezeti változóból (environment variable) adjuk át a backendnek. Ha véletlenül
> felkerült a GitHubra, azonnal generálj újat, és töröld a régit.

**A callback URL** a `4200`-as porton van, nem a backend `8083`-as portján: a GitHub oda
irányítja vissza a böngészőt, és a dev szerver proxyja viszi át a backendhez (lásd 4.1). Így
a session süti a frontend címéhez tartozik, amelyről az Angular a kéréseit küldi.

### A környezeti változók beállítása

A backend a `GITHUB_CLIENT_ID` és `GITHUB_CLIENT_SECRET` változókból olvassa az adatokat.
Ha nincsenek beállítva, a backend el sem indul (`Could not resolve placeholder 'GITHUB_CLIENT_ID'`).

* **IntelliJ IDEA:** Run → Edit Configurations… → az `Application` futtatási konfiguráció →
  **Environment variables**: `GITHUB_CLIENT_ID=Ov23li...;GITHUB_CLIENT_SECRET=...`
* **PowerShell:**

  ```powershell
  $env:GITHUB_CLIENT_ID = "Ov23li..."
  $env:GITHUB_CLIENT_SECRET = "..."
  cd neptun-pp; mvn spring-boot:run
  ```

* **bash / Git Bash:**

  ```bash
  export GITHUB_CLIENT_ID=Ov23li...
  export GITHUB_CLIENT_SECRET=...
  cd neptun-pp && mvn spring-boot:run
  ```

A változók csak abban a terminálablakban élnek, ahol beállítottad őket.

---

## 3. Backend: Spring Security `oauth2Login` (15')

### 3.1 Függőség

A Spring Boot 4-ben az OAuth2 kliens startere `spring-boot-starter-security-oauth2-client`
(a régi `spring-boot-starter-oauth2-client` név elavult). Magával hozza a Spring Securityt is.

**Hova:** `neptun-pp/pom.xml` – a `<dependencies>` közé

```xml
        <!-- Spring Security + OAuth 2.0 kliens ("Bejelentkezés GitHubbal") -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security-oauth2-client</artifactId>
        </dependency>
```

### 3.2 Konfiguráció

A GitHub a Spring Security beépített szolgáltatói között van (`CommonOAuth2Provider`): az
authorize, token és user-info címeket, valamint a `read:user` scope-ot nem kell megadni, csak
a client id-t és a secretet. A `redirect-uri`-t a 4200-as portra állítjuk (lásd fent); a
`{registrationId}` helyére a Spring a `github` szót írja.

**Hova:** `neptun-pp/src/main/resources/application.yml` – a fájl **teljes tartalmát** cseréld le erre

```yaml
server.port: 8083
spring:
  banner:
    location: classpath:banner.txt
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
    generate-ddl: true
    show-sql: true
  h2.console:
    enabled: true
    path: /db
  # OAuth 2.0 bejelentkezés GitHubbal. A titkokat környezeti változókból olvassuk!
  security:
    oauth2:
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            # a GitHub ide irányít vissza: a frontend címe, a dev szerver proxyja viszi a backendhez
            redirect-uri: "${app.frontend-url}/login/oauth2/code/{registrationId}"

# az Angular alkalmazás címe: sikeres bejelentkezés után ide megyünk vissza
app:
  frontend-url: http://localhost:4200
```

### 3.3 A biztonsági konfiguráció

* `oauth2Login(...)`: bekapcsolja a fenti folyamatot; két útvonalat kezel:
  `/oauth2/authorization/github` (indítás) és `/login/oauth2/code/github` (visszatérés).
  Sikeres bejelentkezés után az Angular alkalmazásra irányít.
* **401 az `/api/**`-ra:** bejelentkezés nélkül a Spring alapból a GitHubra irányítana (302).
  Egy böngészőben megnyitott oldalnál ez jó, de az Angular `HttpClient` kéréseinél nem:
  ott egy egyszerű 401 kell, amire a frontend a saját bejelentkező oldalát mutatja.
* `logout(...)`: a `POST /logout` érvényteleníti a sessiont; átirányítás helyett 200-at ad,
  mert az Angular hívja.
* `csrf(csrf -> csrf.spa())`: SPA-knak való CSRF-beállítás. A token egy `XSRF-TOKEN` nevű,
  JavaScriptből olvasható sütibe kerül, és a módosító kérésekben (POST, PUT, DELETE) az
  `X-XSRF-TOKEN` fejlécben kell visszaküldeni. **Az Angular `HttpClient` ezt magától
  megcsinálja**, pont ezekkel a nevekkel. Egy idegen oldal a sütit nem tudja kiolvasni,
  így a fejlécet sem tudja beállítani. A H2 konzol saját űrlapjai nem küldenek ilyen
  fejlécet, ezért a `/db/**` kivétel.
* A `CsrfCookieFilter` minden válaszban kiküldi a CSRF-sütit. Enélkül csak akkor kerülne ki,
  amikor a tokent először használjuk, és az első POST még token nélkül menne.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/security/SecurityConfig.java` – **új fájl**

```java
package hu.inf.unideb.neptun.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Bejelentkezés GitHubbal (OAuth 2.0 authorization code flow), a backend MINDEN útvonalára.
 * A bejelentkezés eredménye egy session (JSESSIONID süti), ezért CSRF-védelem is kell.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            final HttpSecurity http,
            @Value("${app.frontend-url}") final String frontendUrl) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().authenticated())
                // /oauth2/authorization/github → GitHub → /login/oauth2/code/github → frontend
                .oauth2Login(oauth2 -> oauth2
                        .defaultSuccessUrl(frontendUrl, true))
                // az /api/** kérésekre bejelentkezés nélkül 401 (és nem 302 a GitHubra)
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                PathPatternRequestMatcher.pathPattern("/api/**")))
                // POST /logout → 200 (az Angular hívja, nem kell átirányítás)
                .logout(logout -> logout
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler()))
                // XSRF-TOKEN süti → X-XSRF-TOKEN fejléc (az Angular HttpClient magától kezeli)
                .csrf(csrf -> csrf
                        .spa()
                        .ignoringRequestMatchers("/db/**"))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                // a H2 konzol <frame>-eket használ
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .build();
    }
}
```

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/security/CsrfCookieFilter.java` – **új fájl**

```java
package hu.inf.unideb.neptun.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * A CSRF token alapból csak akkor kerül ki az XSRF-TOKEN sütibe, amikor valaki először
 * használja (deferred token). Ez a szűrő minden kérésnél "használja", így a süti már az első
 * GET után ott van, és az Angular az első POST/PUT/DELETE-be is be tudja tenni.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            final HttpServletRequest request,
            final HttpServletResponse response,
            final FilterChain filterChain) throws ServletException, IOException {
        final CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
```

### 3.4 Ki vagyok én? – `/api/user`

A bejelentkezett felhasználót egy `OAuth2User` írja le, aminek az attribútumai a GitHub
`https://api.github.com/user` válaszából jönnek (`login`, `name`, `avatar_url`, ...). Ebből
adjuk vissza azt, ami a frontendnek kell.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/UserController.java` – **új fájl**

```java
package hu.inf.unideb.neptun.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A bejelentkezett GitHub felhasználó adatai. Bejelentkezés nélkül ide el sem jut a kérés:
 * a Spring Security már előtte 401-et ad.
 */
@RestController
public class UserController {

    public record UserInfo(String login, String name, String avatarUrl) {
    }

    @GetMapping("/api/user")
    public UserInfo me(@AuthenticationPrincipal final OAuth2User user) {
        return new UserInfo(
                user.getAttribute("login"),
                user.getAttribute("name"),
                user.getAttribute("avatar_url"));
    }
}
```

Próba (a környezeti változók beállítása után indítsd a backendet):

* böngészőben `http://localhost:8083/db`: átirányít a GitHubra, majd bejelentkezés után a
  frontendre (`localhost:4200`). Mivel a sütik a hosthoz kötődnek, nem a porthoz, ezután a
  `http://localhost:8083/db` is megnyílik;
* `curl -i http://localhost:8083/api/student` → `401`.

---

## 4. Frontend: proxy, AuthService, guard, bejelentkező oldal (15')

```bash
ng generate interface _model/user
ng generate service _service/auth --skip-tests
ng generate interceptor _service/auth --functional --skip-tests
ng generate guard _service/auth --functional --skip-tests
ng generate component _component/login --skip-tests
```

### 4.1 Proxy

Az `/api` mellett az OAuth útvonalait és a kijelentkezést is a backendhez kell vinni.
**Figyelem:** a `/login/oauth2/**` csak a GitHub visszatérési címét viszi át, magát a `/login`
oldalt (ami az Angular bejelentkező oldala lesz) nem.

**Hova:** `neptun-pp-ng/proxy.conf.json` – a fájl **teljes tartalmát** cseréld le erre

```json
{
  "/api/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/oauth2/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/login/oauth2/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/logout": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  }
}
```

A `proxy.conf.json` módosítása után az `npm start`-ot újra kell indítani.

### 4.2 Modell

**Hova:** `neptun-pp-ng/src/app/_model/user.ts` – **új fájl**

```ts
/** A backend /api/user válasza (a GitHub felhasználó adatai) */
export interface User {
  login: string;
  name?: string;
  avatarUrl: string;
}
```

### 4.3 AuthService

A frontend nem tud jelszót, nem tud tokent: csak azt kérdezheti meg a backendtől, hogy van-e
érvényes sessionje (`GET /api/user`: 200 vagy 401). Ezt **az alkalmazás indulásakor** egyszer
megtesszük (4.6), így a guard már tudja a választ. A bejelentkezés egy **teljes oldalas
navigáció** a backendhez (nem `HttpClient` kérés!), hiszen a böngészőnek el kell jutnia a
GitHub oldalára.

**Hova:** `neptun-pp-ng/src/app/_service/auth.ts` – **új fájl**

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { User } from '../_model/user';

/**
 * OAuth 2.0 (GitHub): a bejelentkezést teljesen a backend intézi, az eredmény egy
 * session süti (JSESSIONID, HttpOnly: JavaScriptből nem látszik). A frontend csak
 * megkérdezi a backendtől, ki van bejelentkezve.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  /** A bejelentkezett felhasználó, vagy undefined */
  user?: User;

  get loggedIn(): boolean {
    return !!this.user;
  }

  /** Induláskor: van-e már érvényes sessionünk? (200 → igen, 401 → nem) */
  load(): Observable<unknown> {
    return this.httpClient.get<User>('/api/user').pipe(
      tap((user) => (this.user = user)),
      catchError(() => of(undefined)),
    );
  }

  /** Teljes oldalas navigáció: backend → GitHub → backend → vissza ide (4200) */
  login(): void {
    window.location.href = '/oauth2/authorization/github';
  }

  /** POST /logout: a backend érvényteleníti a sessiont (a CSRF fejlécet az Angular teszi bele). */
  logout(): void {
    this.httpClient
      .post('/logout', null)
      .pipe(finalize(() => this.clear()))
      .subscribe({ error: () => {} });
  }

  /** Kijelentkezett állapot (pl. lejárt a session) → bejelentkező oldal */
  clear(): void {
    this.user = undefined;
    this.router.navigate(['/login']);
  }
}
```

> A GitHubon ettől még bejelentkezve maradsz; a következő „Bejelentkezés GitHubbal” ezért
> már jelszó nélkül, azonnal visszadob (az engedélyezést is csak az első alkalommal kéri).

### 4.4 Interceptor

Ha bejelentkezve 401-et kapunk (lejárt a session, vagy újraindult a backend: a session a
memóriában volt), átirányít a bejelentkező oldalra.

**Hova:** `neptun-pp-ng/src/app/_service/auth-interceptor.ts` – **új fájl**

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

/** Bejelentkezve kapott 401: a session lejárt (vagy újraindult a backend) → bejelentkező oldal. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.loggedIn) {
        auth.clear();
      }
      return throwError(() => error);
    }),
  );
};
```

### 4.5 Guard

A guard csak kényelmi funkció: a valódi védelem a backenden van.

**Hova:** `neptun-pp-ng/src/app/_service/auth-guard.ts` – **új fájl**

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/** Bejelentkezés nélkül a /login oldalra irányít. (A valódi védelem a backenden van!) */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn || inject(Router).createUrlTree(['/login']);
```

### 4.6 Regisztráció

A `provideAppInitializer` az alkalmazás indulása előtt lefut, és megvárja a visszaadott
Observable-t: így mire az első útvonal (és a guard) kiértékelődik, már tudjuk, be vagyunk-e
jelentkezve. A CSRF fejléchez nem kell semmit beállítani: a `provideHttpClient()` alapból
tartalmazza az XSRF-interceptort (`XSRF-TOKEN` süti → `X-XSRF-TOKEN` fejléc, csak relatív
URL-ű, módosító kérésekre).

**Hova:** `neptun-pp-ng/src/app/app.config.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
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
```

**Hova:** `neptun-pp-ng/src/app/app.routes.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';
import { Login } from './_component/login/login';
import { authGuard } from './_service/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'student',
    component: StudentList,
    canActivate: [authGuard]
  },
  {
    path: 'student/create',
    component: StudentEdit,
    canActivate: [authGuard]
  },
  {
    path: 'student/:neptun',
    component: StudentEdit,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
```

### 4.7 A Login komponens

Nincs űrlap: egyetlen gomb, ami elindítja a folyamatot.

**Hova:** `neptun-pp-ng/src/app/_component/login/login.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../_service/auth';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthService);
}
```

**Hova:** `neptun-pp-ng/src/app/_component/login/login.html` – **új fájl**

```html
<div class="container">
  <div class="card my-2 mx-auto" style="max-width: 400px">
    <div class="card-header text-bg-primary">Bejelentkezés</div>
    <div class="card-body">
      <p>
        A Neptun++ a GitHub fiókoddal azonosít. A jelszavadat csak a GitHub látja,
        mi csak a felhasználónevedet és a profilképedet kapjuk meg.
      </p>
      <button type="button" class="btn btn-dark w-100" (click)="auth.login()">
        <i class="bi bi-github me-1"></i>Bejelentkezés GitHubbal
      </button>
    </div>
  </div>
</div>
```

### 4.8 Navbar

A menü csak bejelentkezve látszik, jobb oldalon a GitHub profilkép, a felhasználónév és a
kijelentkezés gombja.

**Hova:** `neptun-pp-ng/src/app/app.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './_service/auth';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
}
```

**Hova:** `neptun-pp-ng/src/app/app.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<nav class="navbar bg-dark navbar-expand-lg sticky-top" data-bs-theme="dark">
  <div class="container">
    <a class="navbar-brand" [routerLink]="'/'">
      <img src="https://inf.unideb.hu/themes/custom/unideb_gamma/logo.svg" alt="Logo" width="30" height="24"
           class="d-inline-block align-text-top">
      Neptun++
    </a>

    <!-- kis kijelzőn a menü összecsukódik (Bootstrap JS: data-bs-toggle="collapse") -->
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <!-- routerLinkActive: az aktív útvonal linkje megkapja az 'active' osztályt -->
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        @if (auth.loggedIn) {
          <li class="nav-item">
            <a class="nav-link"
               [routerLink]="'student'"
               [routerLinkActive]="'active'">Hallgatók</a>
          </li>
        }
      </ul>

      <!-- bejelentkezve: GitHub profilkép, név, kijelentkezés -->
      @if (auth.user; as user) {
        <span class="navbar-text me-2" [title]="user.name ?? user.login">
          <img [src]="user.avatarUrl" alt="" width="24" height="24" class="rounded-circle me-1">
          {{ user.login }}
        </span>
        <button type="button" class="btn btn-sm btn-outline-light" title="Kijelentkezés"
                (click)="auth.logout()">
          <i class="bi bi-box-arrow-right"></i>
          <span class="d-none d-md-inline ms-1">Kijelentkezés</span>
        </button>
      }
    </div>
  </div>
</nav>

<router-outlet />
```

> A Tárgyak és Tárgyfelvételek link kikerült: a v10-ben még nincs ilyen oldal.

Próba:

1. `http://localhost:4200` → a guard a `/login` oldalra visz → **Bejelentkezés GitHubbal** →
   GitHub engedélyezés (első alkalommal) → vissza a hallgatólistára, a navbaron a profilképed;
2. a fejlesztői eszközökben (Application → Cookies) nézd meg a `JSESSIONID` (HttpOnly) és az
   `XSRF-TOKEN` sütit, a Network fülön pedig egy mentés `X-XSRF-TOKEN` fejlécét;
3. töröld a `JSESSIONID` sütit, és frissítsd a listát: az interceptor a bejelentkező oldalra visz;
4. GitHubon a Settings → Applications → Authorized OAuth Apps alatt látszik (és visszavonható)
   az engedély.

---

## Függelék

### Gyakori hibák

| Hiba | Ok |
|---|---|
| `Could not resolve placeholder 'GITHUB_CLIENT_ID'` | nincs beállítva a környezeti változó abban a terminálban / run configban |
| GitHub: *The redirect_uri is not associated with this application* | a GitHubon megadott callback URL nem `http://localhost:4200/login/oauth2/code/github` |
| `[authorization_request_not_found]` | a bejelentkezést a `8083`-as porton kezdted, a visszatérés a `4200`-asra jött, vagy újraindult közben a backend; kezdd újra a `4200`-ról |
| a bejelentkező gomb után az Angular oldala jön vissza | nem indult újra az `npm start` a `proxy.conf.json` módosítása után |
| POST/PUT 403 | hiányzik a CSRF fejléc: a kérés nem relatív URL-re megy, vagy nincs `XSRF-TOKEN` süti |

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-auth-oauth2`) van. A többi v11
változat ugyanebből a v10-es állapotból indul, egymástól függetlenül.
