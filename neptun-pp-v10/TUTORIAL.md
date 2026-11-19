# Neptun++ v10 – óraterv: navbar, EmptyRow, rendezhető fejlécek (30 perc)

**Kiinduló állapot:** a `neptun-pp-v9-start` (zip) mappa. A backend benne már **kész és
refaktorált** (Spring Boot 4.1.2, validáció, hibakezelés, tárgy- és tárgyfelvétel-végpontok),
a frontend pedig az, ahová az előző órán közösen eljutottunk (hallgatólista, hallgató
szerkesztése, klasszikus, signal nélküli Angular).

**Végállapot:** ez a mappa (`neptun-pp-v10`). Ez az a pont, ahová a múlt órán eljutottunk;
innen ágaznak el a `neptun-pp-v11-*` változatok (lásd a fájl végén).

**Az óra célja**, csak a frontenden: tavalyi minták újraépítése: **navbar
`routerLinkActive`-val**, **EmptyRow**, **sortable-th v1/v2/v3**.

| # | Téma | Idő |
|---|---|---|
| 0 | A starter kód (óra előtt) | – |
| 1 | Navbar `routerLinkActive`-val, reszponzív gombok | 10' |
| 2 | `EmptyRow`: „nincs adat” sor | 5' |
| 3 | Rendezhető fejlécek: v1, v2, v3 | 15' |
| | **Összesen** | **30'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni. Az új komponenseket érdemes
`ng generate`-tel létrehozni (a parancsok a lépések elején vannak), majd a generált fájlok
tartalmát lecserélni a megadott kódra.

---

## 0. A starter kód (óra előtt)

### 0.1 Backend (kész, ezen az órán nem módosítjuk)

A backend a refaktorálás után ezeket nyújtja a frontendnek:

| Végpont | Leírás |
|---|---|
| `GET/POST/PUT /api/student`, `GET/DELETE /api/student/{neptun}` | hallgatók (mint eddig) |
| `GET /api/subject` | tárgyak |
| `GET /api/enrollment` | tárgyfelvételek, benne a teljes `student` és `subject` objektummal |

A hibákat egységes JSON-ben (`ProblemDetail`) adja vissza, a megfelelő HTTP státuszkóddal.
Ezekre a `v11-ux` változat hibakezelő lépésében építünk:

| Helyzet | HTTP | Példa válasz |
|---|---|---|
| nem létező hallgató | 404 | `{ "status": 404, "title": "Not Found", "detail": "Not found" }` |
| tárgyfelvétellel rendelkező hallgató törlése | 409 | `{ "status": 409, "title": "Conflict", ... }` |
| validációs hiba (`@NotBlank`, `@Size(3–100)`, `@NotNull`) | 400 | `{ "status": 400, ..., "errors": { "name": "nem lehet üres" } }` |

A validációs üzenetek nyelvét a kérés `Accept-Language` fejléce határozza meg (magyar vagy angol).

> **Spring Boot 3.5 → 4.1.2:** a `pom.xml`-ben a parent verzió változott, a
> `spring-boot-starter-web` új neve `spring-boot-starter-webmvc`, a H2 konzolhoz pedig külön
> `spring-boot-h2console` függőség kell. A Java kódhoz nem kellett hozzányúlni (alatta
> Spring Framework 7, Hibernate 7, Jackson 3 fut; a dátumok továbbra is ISO szövegként mennek ki).

### 0.2 Frontend: előkészítés

A starterben a szükséges csomagok már szerepelnek a `package.json`-ban, ezért elég ennyi:

```bash
cd neptun-pp-ng
npm install
```

Ha valaki a saját, előző órai projektjéből indul, ezeket kell telepítenie:

```bash
npm install @ngx-translate/core @ngx-translate/http-loader \
            @ng-bootstrap/ng-bootstrap @popperjs/core @angular/localize \
            bootstrap-icons
```

Az `angular.json`-ban (`build.options`) a starter már tartalmazza az alábbiakat. Az
`@angular/localize/init` polyfill az ng-bootstrap miatt kötelező, a `bootstrap-icons` pedig
az ikonokhoz kell.

```json
"polyfills": ["zone.js", "@angular/localize/init"],
"styles": [
  "node_modules/bootstrap-icons/font/bootstrap-icons.css",
  "src/styles.scss"
],
```

### 0.3 Futtatás

```bash
cd neptun-pp && mvn spring-boot:run       # http://localhost:8083
cd neptun-pp-ng && npm start              # http://localhost:4200 (a /api a proxy.conf.json szerint megy át)
```

> A starterben az `app.spec.ts` „should render the brand” tesztje még elbukik, mert navbart vár;
> az 1. lépés után zöld lesz. A build két `NG8113` figyelmeztetést ad (nem használt `JsonPipe`
> import): az App-é az 1. lépésben, a StudentEdit-é a `v11-ux` modalos lépésében tűnik el.

---

## 1. Navbar `routerLinkActive`-val, reszponzív gombok (10')

### 1.1 Az App komponens

A navbar linkjeihez a `RouterLink` és a `RouterLinkActive` direktívát kell importálni. Az
eddigi, nem használt importokat (`JsonPipe`, `Student`, ...) kitöröljük.

**Hova:** `neptun-pp-ng/src/app/app.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {}
```

### 1.2 A navbar

A tavalyi navbar mintájára: sötét, `sticky-top`, logóval, kis kijelzőn pedig összecsukódik
(`navbar-toggler` és `collapse`, amit a Bootstrap JS kezel). A **`routerLinkActive`** az
`active` osztályt teszi arra a linkre, amelyiknek az útvonalán éppen állunk, így a menüben
mindig látszik, hol vagyunk. A Tárgyak és Tárgyfelvételek útvonala csak a `v11-ux` változatban jön
létre; addig a `**` átirányítás miatt a hallgatólistára visznek.

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
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'student'"
             [routerLinkActive]="'active'">Hallgatók</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'subject'"
             [routerLinkActive]="'active'">Tárgyak</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'enrollment'"
             [routerLinkActive]="'active'">Tárgyfelvételek</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<router-outlet />
```

### 1.3 Reszponzív gombok a hallgatólistán

A gombokon az **ikon mindig látszik**, a **felirat csak md (≥ 768 px) mérettől**: a `d-none`
alapból elrejti, a `d-md-inline` md mérettől sorközi elemként megjeleníti. (`d-md-block` nem
jó, mert az a feliratot új sorba, az ikon alá tördelné.) A `title` attribútum miatt felirat
nélkül is van tooltip.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">Hallgatók</span>
      <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
      <a class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
        <i class="bi bi-plus-lg"></i>
        <span class="d-none d-md-inline ms-1">Létrehozás</span>
      </a>
    </div>
    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <th>Neptun</th>
          <th>Name</th>
          <th>Program</th>
          <th>Created</th>
          <th>Updated</th>
          <th>Actions</th>
        </tr>
        </thead>
        <tbody>
          @for (student of students; track student.neptun) {
            <tr [class.table-danger]="student.program === 'BI_BSC'">
              <td><code class="badge text-bg-dark">{{ student.neptun }}</code></td>
              <td>{{ student.name }}</td>
              <td>{{ student.program | program }}</td>
              <td>{{ student.created | date: datetimeFormat }}</td>
              <td>{{ student.updated | date: datetimeFormat }}</td>
              <td>
                <button class="btn btn-sm btn-outline-danger m-1" title="Törlés"
                        (click)="deleteOne(student)">
                  <i class="bi bi-trash"></i>
                  <span class="d-none d-md-inline ms-1">Törlés</span>
                </button>
                <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
                   [routerLink]="student.neptun">
                  <i class="bi bi-pencil"></i>
                  <span class="d-none d-md-inline ms-1">Módosítás</span>
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 1.4 Reszponzív gomb a szerkesztőn

Ugyanez a mentés gombján: új hallgatónál `bi-plus-lg`, meglévőnél `bi-floppy` ikon. Közben
egy hibát is javítunk: a hallgató aszinkron töltődik be, és amíg nincs meg, a sablon
`student.name`-re hivatkozva hibát dobott. Ezért az egészet egy `@if (student)` blokkba tesszük.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
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

---

## 2. `EmptyRow`: „nincs adat” sor (5')

```bash
ng generate component _component/empty-row --skip-tests
```

### 2.1 A komponens

A tavalyi `EmptyRow` egy táblázatsor, ami akkor jelenik meg, ha nincs mit listázni. A
szelektora **attribútum szelektor** (`tr[empty]`), mert a `<tbody>`-ban csak `<tr>` állhat:
egy saját `<app-empty-row>` elem érvénytelen HTML lenne. Így a komponens host eleme maga a `<tr>`.

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * "Nincs megjeleníthető ..." sor egy üres táblázatba (tavalyi minta).
 * Attribútum szelektor (tr[empty]), mert a <tbody>-ban csak <tr> állhat,
 * egy saját <app-empty-row> elem érvénytelen HTML lenne.
 *
 *   @for (...) { ... } @empty {
 *     <tr empty [colSpan]="6">hallgató</tr>
 *   }
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'tr[empty]',
  styleUrl: './empty-row.scss',
  templateUrl: './empty-row.html',
})
export class EmptyRow {
  @Input({ required: true }) colSpan!: number;
}
```

### 2.2 A sablon

Az entitás nevét (pl. „hallgató”) `<ng-content>`-tel kapja: amit a használó a `<tr empty>`
és a `</tr>` közé ír, az ide kerül.

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.html` – **új fájl**

```html
<th [attr.colspan]="colSpan" class="table-warning">
  <div class="d-flex flex-row justify-content-center align-items-center">
    <i class="bi bi-emoji-smile-upside-down-fill me-2"
       [style.font-size.em]="1.5"></i>
    Nincs megjeleníthető <ng-content></ng-content>!
  </div>
</th>
```

### 2.3 Használat a hallgatólistán

A komponenst fel kell venni az `imports` tömbbe. A `students` mezőt üres tömbre
inicializáljuk, hogy betöltés előtt se `undefined` legyen.

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
import { DatePipe } from '@angular/common';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { RouterLink } from '@angular/router';
import { EmptyRow } from '../empty-row/empty-row';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, RouterLink, EmptyRow],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.client.findAll().subscribe((data) => {
      this.students = data;
      this.cdr.markForCheck();
    });
  }

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

A `@for` **`@empty`** ága akkor fut le, ha a tömb üres; ide kerül az `EmptyRow`.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">Hallgatók</span>
      <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
      <a class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
        <i class="bi bi-plus-lg"></i>
        <span class="d-none d-md-inline ms-1">Létrehozás</span>
      </a>
    </div>
    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <th>Neptun</th>
          <th>Name</th>
          <th>Program</th>
          <th>Created</th>
          <th>Updated</th>
          <th>Actions</th>
        </tr>
        </thead>
        <tbody>
          @for (student of students; track student.neptun) {
            <tr [class.table-danger]="student.program === 'BI_BSC'">
              <td><code class="badge text-bg-dark">{{ student.neptun }}</code></td>
              <td>{{ student.name }}</td>
              <td>{{ student.program | program }}</td>
              <td>{{ student.created | date: datetimeFormat }}</td>
              <td>{{ student.updated | date: datetimeFormat }}</td>
              <td>
                <button class="btn btn-sm btn-outline-danger m-1" title="Törlés"
                        (click)="deleteOne(student)">
                  <i class="bi bi-trash"></i>
                  <span class="d-none d-md-inline ms-1">Törlés</span>
                </button>
                <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
                   [routerLink]="student.neptun">
                  <i class="bi bi-pencil"></i>
                  <span class="d-none d-md-inline ms-1">Módosítás</span>
                </a>
              </td>
            </tr>
          } @empty {
            <!-- ha a tömb üres, ez a sor jelenik meg -->
            <tr empty [colSpan]="6">hallgató</tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## 3. Rendezhető fejlécek: v1, v2, v3 (15')

```bash
ng generate pipe _pipe/sort --skip-tests
ng generate component _component/sortable-th-v1 --skip-tests
ng generate component _component/sortable-th-v2 --skip-tests
ng generate component _component/sortable-th-v3 --skip-tests
ng generate directive _component/sortable-th-v3/sortable-table --skip-tests
```

### 3.1 A rendező pipe

Mindhárom változat ugyanezt a pipe-ot használja a tényleges rendezéshez. Generikus: bármilyen
`T[]`-t rendez `keyof T` szerint, és új tömböt ad vissza, az eredetit nem módosítja.

**Hova:** `neptun-pp-ng/src/app/_pipe/sort-pipe.ts` – **új fájl**

```ts
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generikus rendezés bármilyen T típusú tömbre:
 *   @for (s of students | sort: orderBy : desc; track s.neptun) { ... }
 *
 * Új tömböt ad vissza, az eredetit nem rendezi át.
 */
@Pipe({
  name: 'sort',
})
export class SortPipe implements PipeTransform {
  transform<T>(items: T[] | undefined, orderBy?: keyof T, desc = false): T[] {
    if (!items || !orderBy) {
      return items ?? [];
    }
    return [...items].sort((a, b) => {
      if (a[orderBy] == b[orderBy]) {
        return 0;
      }
      return (a[orderBy] < b[orderBy] ? -1 : 1) * (desc ? -1 : 1);
    });
  }
}
```

### 3.2 v1: egyirányú kötés (tavalyi)

Minden adat **inputon** megy lefelé, még a rendező függvény (`order`) is, amit a szülő ad át.
A fejléc maga nem dönt semmiről, csak meghívja a kapott függvényt.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v1/sortable-th-v1.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v1: EGYIRÁNYÚ kötés (a tavalyi megoldás).
 * Minden adat inputon jön lefelé, a rendezést végző függvényt is a szülő adja át:
 *
 *   <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
 *
 * A szülőben az order arrow function legyen, hogy a `this` ott is a szülőt jelentse!
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'th[sortable-v1]',
  styleUrl: './sortable-th-v1.scss',
  templateUrl: './sortable-th-v1.html',
})
export class SortableThV1 {
  @Input({ required: true }) value!: Student.Key;
  @Input() orderBy?: Student.Key;
  @Input() desc = false;
  @Input({ required: true }) order!: (value: Student.Key) => void;
}
```

A sablon kattintásra meghívja az `order` függvényt, és ha éppen ez az oszlop a rendezés
alapja, kirajzolja az irány ikonját.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v1/sortable-th-v1.html` – **új fájl**

```html
<div (click)="order(value)">
  <ng-content></ng-content>
  @if (orderBy === value) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!desc"
       [class.bi-sort-down]="desc"></i>
  }
</div>
```

A mutató kézzé változik a fejléc fölött, jelezve, hogy kattintható.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v1/sortable-th-v1.scss` – **új fájl**

```scss
div {
  cursor: pointer;
}
```

### 3.3 v2: kétirányú kötés

Ha van egy `x` @Input és egy `xChange` @Output, a szülő írhatja azt, hogy `[(x)]`
(„banana in a box”), ami ennek a rövidítése: `[x]="v" (xChange)="v = $event"`. A
rendezés logikája itt a fejlécben van, a szülőnek nem kell függvényt írnia.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v2/sortable-th-v2.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v2: KÉTIRÁNYÚ kötés ("banana in a box").
 * Ha van `x` @Input és `xChange` @Output, a szülő írhatja: [(x)]="valtozo"
 * ami ennek a rövidítése: [x]="valtozo" (xChange)="valtozo = $event"
 *
 *   <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
 *
 * A rendezés logikája itt van, a szülőnek nem kell order() függvényt írnia.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'th[sortable-v2]',
  styleUrl: './sortable-th-v2.scss',
  templateUrl: './sortable-th-v2.html',
})
export class SortableThV2 {
  @Input({ required: true }) value!: Student.Key;

  @Input() orderBy?: Student.Key;
  @Output() orderByChange = new EventEmitter<Student.Key>();

  @Input() desc = false;
  @Output() descChange = new EventEmitter<boolean>();

  protected click(): void {
    if (this.orderBy === this.value) {
      this.descChange.emit(!this.desc);
    } else {
      this.orderByChange.emit(this.value);
      this.descChange.emit(false);
    }
  }
}
```

A sablon ugyanaz, mint a v1-nél, csak a kattintás a saját `click()` metódust hívja.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v2/sortable-th-v2.html` – **új fájl**

```html
<div (click)="click()">
  <ng-content></ng-content>
  @if (orderBy === value) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!desc"
       [class.bi-sort-down]="desc"></i>
  }
</div>
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v2/sortable-th-v2.scss` – **új fájl**

```scss
div {
  cursor: pointer;
}
```

### 3.4 v3: generikus megoldás

A v3 két részből áll. Az első egy **direktíva**, ami egy közös ősön (pl. a táblázaton) ül, és
egy `Sort<T>` objektumban tárolja a rendezés állapotát. Kétirányúan köthető: `[(sort)]`.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-table.ts` – **új fájl**

```ts
import { Directive, EventEmitter, Input, Output } from '@angular/core';

/** A rendezés állapota egy objektumban: mi szerint és milyen irányban. */
export interface Sort<T> {
  orderBy: keyof T;
  desc: boolean;
}

/**
 * v3 (generikus), 1. rész: a közös ős (pl. a táblázat) tárolja a rendezés állapotát.
 * Kétirányúan köthető: <app-list-card sortable-table [(sort)]="sort">
 *
 * A th[sortable-v3] fejlécek DI-vel (inject) megtalálják ezt a direktívát,
 * ezért nem kell nekik egyenként átadni az orderBy / desc értékeket.
 */
@Directive({
  selector: '[sortable-table]',
})
export class SortableTable<T> {
  @Input() sort?: Sort<T>;
  @Output() sortChange = new EventEmitter<Sort<T>>();

  toggle(orderBy: keyof T): void {
    this.sort = {
      orderBy,
      desc: this.sort?.orderBy === orderBy ? !this.sort.desc : false,
    };
    this.sortChange.emit(this.sort);
  }
}
```

A második a **fejléc**. Ez nem inputon kapja az állapotot, hanem `inject()`-tel felfelé keres
az elemfán, és megtalálja a legközelebbi `[sortable-table]` direktívát. Így nincs `Student`-hez
kötve (`T` generikus), és nem kell neki egyenként átadni az `orderBy`/`desc` értékeket. Az
input neve (`alias`) megegyezik az attribútuméval, ezért írható így: `<th sortable-v3="name">`.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-th-v3.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { SortableTable } from './sortable-table';

/**
 * v3 (generikus), 2. rész: a fejléc. Nincs Student-hez kötve, bármilyen T-re működik.
 *
 *   <app-list-card sortable-table [(sort)]="sort" ...>
 *     <th sortable-v3="name">Név</th>
 *     <th sortable-v3="credits">Kredit</th>
 *
 * Az állapotot nem inputon kapja, hanem a legközelebbi [sortable-table] őstől (DI).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'th[sortable-v3]',
  styleUrl: './sortable-th-v3.scss',
  templateUrl: './sortable-th-v3.html',
})
export class SortableThV3<T> {
  @Input({ alias: 'sortable-v3', required: true }) value!: keyof T;

  protected readonly table = inject<SortableTable<T>>(SortableTable);
}
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-th-v3.html` – **új fájl**

```html
<div (click)="table.toggle(value)">
  <ng-content></ng-content>
  @if (table.sort?.orderBy === value) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!table.sort?.desc"
       [class.bi-sort-down]="table.sort?.desc"></i>
  }
</div>
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-th-v3.scss` – **új fájl**

```scss
div {
  cursor: pointer;
}
```

A v3-at a `v11-ux` változatban, a tárgy- és a tárgyfelvétel-listán használjuk.

### 3.5 v1 és v2 a hallgatólistán

A szülő tárolja az állapotot (`orderBy`, `desc`). A v1-nek átadott `order` függvény
**arrow function**, különben a `this` a fejlécre mutatna, amikor a fejléc meghívja.

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

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.client.findAll().subscribe((data) => {
      this.students = data;
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

A Neptun-kód és a Név oszlop v1, a többi v2, de **ugyanazt** az `orderBy`/`desc` állapotot
használják. A `@for` most a `sort` pipe-on keresztül kapja a hallgatókat.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">Hallgatók</span>
      <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
      <a class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
        <i class="bi bi-plus-lg"></i>
        <span class="d-none d-md-inline ms-1">Létrehozás</span>
      </a>
    </div>
    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <!-- v1: egyirányú kötés, a szülő order függvényét kapja -->
          <th sortable-v1 value="neptun" [orderBy]="orderBy" [desc]="desc" [order]="order">Neptun-kód</th>
          <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
          <!-- v2: kétirányú kötés -->
          <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
          <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">Létrehozva</th>
          <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">Módosítva</th>
          <th>Műveletek</th>
        </tr>
        </thead>
        <tbody>
          @for (student of students | sort: orderBy : desc; track student.neptun) {
            <tr [class.table-danger]="student.program === 'BI_BSC'">
              <td><code class="badge text-bg-dark">{{ student.neptun }}</code></td>
              <td>{{ student.name }}</td>
              <td>{{ student.program | program }}</td>
              <td>{{ student.created | date: datetimeFormat }}</td>
              <td>{{ student.updated | date: datetimeFormat }}</td>
              <td>
                <button class="btn btn-sm btn-outline-danger m-1" title="Törlés"
                        (click)="deleteOne(student)">
                  <i class="bi bi-trash"></i>
                  <span class="d-none d-md-inline ms-1">Törlés</span>
                </button>
                <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
                   [routerLink]="student.neptun">
                  <i class="bi bi-pencil"></i>
                  <span class="d-none d-md-inline ms-1">Módosítás</span>
                </a>
              </td>
            </tr>
          } @empty {
            <!-- ha a tömb üres, ez a sor jelenik meg -->
            <tr empty [colSpan]="6">hallgató</tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

| | v1 | v2 | v3 |
|---|---|---|---|
| Kötés | egyirányú (`[x]`) | kétirányú (`[(x)]`) | DI (`inject`) |
| Logika helye | szülő | fejléc | konténer-direktíva |
| Típus | `Student` | `Student` | bármilyen `T` |


## Függelék

### Megoldás

A lépések végeredménye ebben a mappában van. Futtatás:

```bash
cd neptun-pp && mvn spring-boot:run       # http://localhost:8083
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200
```

> **Backend, JDK 25:** a v9-starthoz képest a `pom.xml` kapott egy `<build>` részt. JDK 23 óta a
> `javac` magától nem futtatja az annotációfeldolgozókat, ezért a Lombokot a
> `maven-compiler-plugin` `annotationProcessorPaths` beállításában meg kell adni, különben a
> `mvn` parancssori fordítás `cannot find symbol` hibákkal elbukik (IntelliJ-ben ez nem jön
> elő, mert az IDE magától beállítja). Ugyanitt a `spring-boot-maven-plugin` is szerepel a
> `mvn spring-boot:run` miatt.

> A build még két figyelmeztetést ad: a StudentEdit nem használt `JsonPipe` importját (a
> `v11-ux` modalos lépésében tűnik el), és a 500 kB-os bundle budget túllépését (a Bootstrap CSS
> miatt; ártalmatlan).

### Folytatás: a v11 változatok

Mindegyik **ebből a v10-es állapotból** indul, egymástól függetlenül, egymás mellett:

| Mappa | Téma |
|---|---|
| `neptun-pp-v11-ux` | `ListCard`, SubjectList és EnrollmentList, modalok, hibák megjelenítése |
| `neptun-pp-v11-i18n` | többnyelvűség ngx-translate-tel |
| `neptun-pp-v11-auth-basic-inmemory` | Spring Security HTTP Basic, memóriabeli felhasználók |
| `neptun-pp-v11-auth-oauth2` | Spring Security OAuth2 login GitHubbal |
| `neptun-pp-v11-reactive` | a frontend átírása Angular signalokra |
| `neptun-pp-v11-thymeleaf` | ugyanez szerveroldalon, Thymeleaf sablonokkal (Angular nélkül) |
| `neptun-pp-v11-seo` | Angular SSR, hydration és keresőoptimalizálás |
| `neptun-pp-v11-build` | frontend és backend egyetlen deployolható WAR-ban (`mvn package -PbuildNg`) |
| `neptun-pp-v11-swagger` | OpenAPI leírás és Swagger UI a REST API-hoz (springdoc) |
