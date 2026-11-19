# Neptun++ v11-auth-basic-inmemory – óraterv: HTTP Basic autentikáció (40 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-auth-basic-inmemory`).

**Az óra célja:**

* a backenden **Spring Security**: a backend **összes útvonala** (az `/api/**` és a `/db`
  H2 konzol is) csak bejelentkezve érhető el, **HTTP Basic** autentikációval;
* a felhasználók a **memóriában** vannak (`InMemoryUserDetailsManager`), nincs adatbázis-tábla;
* egyszerű **jogosultságkezelés**: törölni csak az `ADMIN` szerepkör tud (403-at kap a többi);
* a frontenden **bejelentkező oldal**, **interceptor** (minden kérésbe beteszi a
  hitelesítő fejlécet), **route guard** és kijelentkezés;
* a frontend továbbra is a `proxy.conf.json`-on keresztül éri el a backendet; a proxy a
  fejléceket (köztük az `Authorization`-t) változatlanul továbbítja.

| # | Téma | Idő |
|---|---|---|
| 1 | Hogyan működik a HTTP Basic? | 5' |
| 2 | Backend: Spring Security, memóriabeli felhasználók | 15' |
| 3 | Frontend: AuthService, interceptor, guard | 10' |
| 4 | Frontend: bejelentkező oldal, navbar | 10' |
| | **Összesen** | **40'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

Futtatás (a backendhez JDK 25 kell):

```bash
cd neptun-pp && mvn spring-boot:run           # http://localhost:8083
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200
```

| Felhasználónév | Jelszó | Szerepkörök | Mit tud? |
|---|---|---|---|
| `user` | `user` | `USER` | mindent, kivéve a törlést |
| `admin` | `admin` | `USER`, `ADMIN` | mindent |

---

## 1. Hogyan működik a HTTP Basic? (5')

A kliens **minden kérésben** elküldi a felhasználónevet és a jelszót egy fejlécben:

```
Authorization: Basic dXNlcjp1c2Vy        ← base64("user:user")
```

* A base64 **nem titkosítás**, csak kódolás: bárki visszafejti. Élesben ezért csak HTTPS-en
  szabad használni.
* Nincs „bejelentkezés” és nincs munkamenet (session): a szerver minden kérésnél újra ellenőriz.
  Ezért **állapotmentes** (stateless), és nincs süti, így CSRF-támadás sem érinti.
* Ha a kérésben nincs (jó) fejléc, a szerver `401 Unauthorized` választ ad. Ha a válaszban
  `WWW-Authenticate: Basic` fejléc is van, a **böngésző feldobja a saját bejelentkező
  ablakát**. Közvetlenül megnyitva (pl. `http://localhost:8083/api/student` vagy a `/db` H2
  konzol) pont ezt szeretnénk, az Angular alkalmazásban viszont nem: ott saját bejelentkező
  oldal lesz.
* A Spring Security erre beépített megoldást ad: ha a kérésben ott van az
  `X-Requested-With: XMLHttpRequest` fejléc (vagyis JavaScriptből jön), a 401-es válaszba
  **nem** teszi bele a `WWW-Authenticate` fejlécet, így a böngésző nem dob fel ablakot. Ezt
  a fejlécet az Angular interceptor fogja hozzáadni.

Kipróbálás a backend elkészülte után:

```bash
curl -i http://localhost:8083/api/student                       # 401 + WWW-Authenticate: Basic
curl -i -H "X-Requested-With: XMLHttpRequest" http://localhost:8083/api/student   # 401, fejléc nélkül
curl -i -u user:user http://localhost:8083/api/user              # 200 {"name":"user","roles":["ROLE_USER"]}
curl -i -u user:user -X DELETE http://localhost:8083/api/student/XYZ    # 403 Forbidden
curl -i -u admin:admin -X DELETE http://localhost:8083/api/student/XYZ  # 200
```

---

## 2. Backend: Spring Security, memóriabeli felhasználók (15')

### 2.1 Függőség

A `spring-boot-starter-security` hozzáadása után **azonnal minden útvonal védett** lesz: a
Spring Boot egy `user` felhasználót generál, a jelszavát indításkor a logba írja. Ezt a
viselkedést írjuk felül a saját konfigurációnkkal.

**Hova:** `neptun-pp/pom.xml` – a `<dependencies>` közé

```xml
        <!-- Spring Security: autentikáció és jogosultságkezelés -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
```

### 2.2 A biztonsági konfiguráció

A `SecurityFilterChain` bean írja le, hogyan védjük a kéréseket. A szabályokat **sorrendben**
nézi, az első illeszkedő dönt, ezért a specifikusabb szabály (DELETE) van elöl.

* `httpBasic(...)`: HTTP Basic autentikáció (a fent leírt `X-Requested-With` viselkedéssel);
* `csrf(disable)`: nincs session és süti, ezért a CSRF-védelemre nincs szükség (különben
  minden POST/PUT/DELETE 403-at kapna);
* `STATELESS`: a Spring ne hozzon létre sessiont, minden kérés önállóan hitelesít;
* `frameOptions(sameOrigin)`: a H2 konzol `<frame>`-eket használ, amit a Spring Security
  alapból tilt.

A jelszavakat **soha nem tároljuk nyíltan**: a `PasswordEncoderFactories` alapértelmezett
kódolója BCrypt-tel hash-el, és a hash elé írja az algoritmus nevét (`{bcrypt}$2a$10$...`).

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/security/SecurityConfig.java` – **új fájl**

```java
package hu.inf.unideb.neptun.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * HTTP Basic autentikáció a backend MINDEN útvonalára, memóriában tárolt felhasználókkal.
 * <p>
 * A böngésző bejelentkező ablaka csak akkor jön fel, ha a 401-es válaszban
 * "WWW-Authenticate: Basic" fejléc van. A Spring Security ezt NEM küldi, ha a kérésben
 * "X-Requested-With: XMLHttpRequest" fejléc van (ezt az Angular interceptor teszi bele).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(final HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        // törölni csak az ADMIN szerepkör tud (a többiek 403-at kapnak)
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                        // minden más útvonal (a /db H2 konzol is): bármely bejelentkezett felhasználó
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                // nincs session és süti → CSRF-védelem sem kell
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // a H2 konzol <frame>-eket használ
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .build();
    }

    /** A felhasználók a memóriában: újraindításkor ugyanezek jönnek létre. */
    @Bean
    public UserDetailsService userDetailsService(final PasswordEncoder passwordEncoder) {
        return new InMemoryUserDetailsManager(
                User.withUsername("user")
                        .password(passwordEncoder.encode("user"))
                        .roles("USER")
                        .build(),
                User.withUsername("admin")
                        .password(passwordEncoder.encode("admin"))
                        .roles("USER", "ADMIN")
                        .build());
    }

    /** Alapértelmezetten BCrypt; a hash elé írja az algoritmust: {bcrypt}$2a$10$... */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
```

### 2.3 Ki vagyok én? – `/api/user`

A frontendnek tudnia kell, hogy jók-e a megadott adatok, és ki jelentkezett be. Erre egy
egyszerű végpont szolgál: a Spring a vezérlő paraméterébe beinjektálja az aktuális
`Authentication` objektumot. (Ha a hitelesítés nem sikerül, ide el sem jut a kérés: a
Spring Security szűrője már előtte 401-et ad.)

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/UserController.java` – **új fájl**

```java
package hu.inf.unideb.neptun.web;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** A bejelentkezett felhasználó adatai, pl. { "name": "admin", "roles": ["ROLE_ADMIN", "ROLE_USER"] } */
@RestController
public class UserController {

    public record UserInfo(String name, List<String> roles) {
    }

    @GetMapping("/api/user")
    public UserInfo me(final Authentication authentication) {
        return new UserInfo(
                authentication.getName(),
                authentication.getAuthorities()
                        .stream()
                        .map(GrantedAuthority::getAuthority)
                        // csak a szerepkörök (a Spring Security 7 pl. FACTOR_PASSWORD-öt is ad)
                        .filter(authority -> authority.startsWith("ROLE_"))
                        .sorted()
                        .toList());
    }
}
```

> A `roles("ADMIN")` a háttérben `ROLE_ADMIN` jogosultságot (authority) hoz létre, a
> `hasRole("ADMIN")` pedig ezt keresi. Ezért látszik a válaszban a `ROLE_` előtag. A Spring
> Security 7 a sikeres hitelesítés módját is jogosultságként jegyzi fel (jelszavas
> bejelentkezésnél `FACTOR_PASSWORD`; ez a többfaktoros hitelesítéshez kell), ezt kiszűrjük.

Indítsd újra a backendet, és próbáld ki az 1. pont végén lévő `curl` parancsokat, illetve
nyisd meg böngészőben a `http://localhost:8083/api/student` címet.

---

## 3. Frontend: AuthService, interceptor, guard (10')

```bash
ng generate interface _model/user
ng generate service _service/auth --skip-tests
ng generate interceptor _service/auth --functional --skip-tests
ng generate guard _service/auth --functional --skip-tests
```

### 3.1 Modell

**Hova:** `neptun-pp-ng/src/app/_model/user.ts` – **új fájl**

```ts
/** A backend /api/user válasza */
export interface User {
  name: string;
  roles: string[];
}
```

### 3.2 AuthService

Ő tárolja a bejelentkezett felhasználót és a kész `Authorization` fejlécértéket. A
`login()` a megadott adatokkal meghívja a `/api/user` végpontot: ha 200 jön, jók az adatok, és
elmentjük őket; ha 401, rosszak. A `sessionStorage` miatt az oldal frissítése után is bent
maradunk, a böngészőlap bezárásakor viszont elfelejtődik.

> A jelszó (base64-ben) a böngészőben marad, ez a HTTP Basic egyik gyengéje. A `v11-auth-oauth2`
> változatban a jelszót a frontend egyáltalán nem látja.

**Hova:** `neptun-pp-ng/src/app/_service/auth.ts` – **új fájl**

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User } from '../_model/user';

/**
 * HTTP Basic autentikáció: a felhasználónév és a jelszó minden kérésben elmegy
 * (Authorization: Basic base64(név:jelszó)). Ezt az authInterceptor teszi a kérésekbe.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly STORAGE_KEY = 'neptun-pp-auth';

  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  /** A bejelentkezett felhasználó, vagy undefined */
  user?: User;
  /** A kész fejlécérték: "Basic dXNlcjp1c2Vy" */
  authorization?: string;

  constructor() {
    // oldalfrissítés után visszatöltjük (a sessionStorage a lap bezárásáig él)
    const saved = sessionStorage.getItem(AuthService.STORAGE_KEY);
    if (saved) {
      ({ user: this.user, authorization: this.authorization } = JSON.parse(saved));
    }
  }

  get loggedIn(): boolean {
    return !!this.authorization;
  }

  /** Ha a /api/user 200-at ad, jók az adatok: elmentjük őket. 401 → hibás név/jelszó. */
  login(username: string, password: string): Observable<User> {
    const authorization = `Basic ${btoa(`${username}:${password}`)}`;
    return this.httpClient
      .get<User>('/api/user', { headers: { Authorization: authorization } })
      .pipe(
        tap((user) => {
          this.user = user;
          this.authorization = authorization;
          sessionStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify({ user, authorization }));
        }),
      );
  }

  logout(): void {
    this.user = undefined;
    this.authorization = undefined;
    sessionStorage.removeItem(AuthService.STORAGE_KEY);
    this.router.navigate(['/login']);
  }
}
```

### 3.3 Interceptor

Minden kimenő kérésbe beteszi az `Authorization` fejlécet (ha van, és a kérés még nem
tartalmazza; a `login()` a sajátját küldi), valamint az `X-Requested-With` fejlécet, hogy a
böngésző ne dobja fel a saját bejelentkező ablakát. Ha bejelentkezve 401 jön vissza (pl.
újraindult a backend, és megváltozott egy jelszó), kijelentkeztet.

**Hova:** `neptun-pp-ng/src/app/_service/auth-interceptor.ts` – **új fájl**

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

/**
 * - Authorization: a bejelentkezett felhasználó Basic fejléce minden kérésbe;
 * - X-Requested-With: ettől a Spring Security 401-nél nem küld "WWW-Authenticate: Basic"
 *   fejlécet, így a böngésző nem dobja fel a saját bejelentkező ablakát.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
  if (auth.authorization && !request.headers.has('Authorization')) {
    headers['Authorization'] = auth.authorization;
  }

  return next(request.clone({ setHeaders: headers })).pipe(
    catchError((error: HttpErrorResponse) => {
      // bejelentkezve kaptunk 401-et: a tárolt adatok már nem jók
      if (error.status === 401 && auth.loggedIn) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
```

### 3.4 Guard

A **route guard** a navigáció előtt fut le. Ha `true`-t ad, mehet a navigáció; ha egy
`UrlTree`-t, akkor oda irányít át. A guard csak kényelmi funkció: a valódi védelem a
backenden van, hiszen a frontend kódját bárki módosíthatja a böngészőben.

**Hova:** `neptun-pp-ng/src/app/_service/auth-guard.ts` – **új fájl**

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/** Bejelentkezés nélkül a /login oldalra irányít. (A valódi védelem a backenden van!) */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn || inject(Router).createUrlTree(['/login']);
```

### 3.5 Regisztráció

Az interceptort a `withInterceptors`, a guardot a route-ok `canActivate` tömbje regisztrálja.

**Hova:** `neptun-pp-ng/src/app/app.config.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './_service/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
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

---

## 4. Frontend: bejelentkező oldal, navbar (10')

```bash
ng generate component _component/login --skip-tests
```

### 4.1 A Login komponens

Sikeres bejelentkezés után a hallgatólistára navigál, hibánál üzenetet ír ki. A 401 itt hibás
felhasználónevet vagy jelszót jelent, a 0 pedig azt, hogy a backend nem érhető el.

**Hova:** `neptun-pp-ng/src/app/_component/login/login.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../_service/auth';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected username = '';
  protected password = '';
  protected error?: string;

  protected login(): void {
    this.error = undefined;
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/student']),
      error: (error: HttpErrorResponse) => {
        this.error =
          error.status === 401 ? 'Hibás felhasználónév vagy jelszó!' : 'A szerver nem érhető el.';
        this.cdr.markForCheck();
      },
    });
  }
}
```

A `<form (ngSubmit)>` miatt Enterrel is be lehet jelentkezni. Az `autocomplete` attribútumok
segítik a böngésző jelszókezelőjét.

**Hova:** `neptun-pp-ng/src/app/_component/login/login.html` – **új fájl**

```html
<div class="container">
  <div class="card my-2 mx-auto" style="max-width: 400px">
    <div class="card-header text-bg-primary">Bejelentkezés</div>
    <form class="card-body" (ngSubmit)="login()">
      @if (error) {
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ error }}
        </div>
      }

      <div class="form-floating my-2">
        <input id="username" name="username" class="form-control" autocomplete="username"
               [(ngModel)]="username">
        <label for="username">Felhasználónév</label>
      </div>

      <div class="form-floating my-2">
        <input id="password" name="password" type="password" class="form-control"
               autocomplete="current-password"
               [(ngModel)]="password">
        <label for="password">Jelszó</label>
      </div>

      <button type="submit" class="btn btn-primary w-100">
        <i class="bi bi-box-arrow-in-right me-1"></i>Bejelentkezés
      </button>
    </form>
  </div>
</div>
```

### 4.2 Navbar

A menü csak bejelentkezve látszik, jobb oldalon pedig a felhasználó neve és a kijelentkezés
gombja.

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

      <!-- bejelentkezve: név + kijelentkezés -->
      @if (auth.user; as user) {
        <span class="navbar-text me-2">
          <i class="bi bi-person-circle me-1"></i>{{ user.name }}
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

> A Tárgyak és Tárgyfelvételek link kikerült: a v10-ben még nincs ilyen oldal, és a `**`
> átirányítás miatt amúgy is a hallgatólistára vittek.

Próba:

1. `user` / `user`: a lista betölt, a törlés viszont `403`-mal elbukik (a v10 `alert`-tel
   írja ki a hibát);
2. kijelentkezés, majd `admin` / `admin`: a törlés is működik;
3. a böngésző fejlesztői eszközeinek Network fülén nézd meg az `Authorization` fejlécet, és
   fejtsd vissza (`atob('...')` a konzolban).

---

## Függelék

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-auth-basic-inmemory`) van. A többi
v11 változat ugyanebből a v10-es állapotból indul, egymástól függetlenül.

### Továbblépési lehetőségek

* a felhasználók adatbázisból: saját `UserDetailsService`, ami egy JPA repositoryból tölt;
* a gombok elrejtése szerepkör szerint (pl. `@if (auth.user?.roles?.includes('ROLE_ADMIN'))`);
* tokenalapú autentikáció (JWT), vagy külső azonosítás: lásd `neptun-pp-v11-auth-oauth2`.
