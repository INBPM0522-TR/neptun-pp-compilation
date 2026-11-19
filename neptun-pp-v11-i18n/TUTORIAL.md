# Neptun++ v11-i18n – óraterv: többnyelvűség ngx-translate-tel (25 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-i18n`).

**Az óra célja**, csak a frontenden: a felület **magyarul és angolul**, újratöltés nélküli
nyelvváltással, minimális konfigurációval (ngx-translate, egy-egy JSON szótár). A backend
validációs üzenetei is a választott nyelven jönnek.

Az Angular beépített i18n-je fordítási időben dolgozik (nyelvenként külön build). Az
ngx-translate a „klasszikus” megoldás: **futásidőben** tölti be a JSON szótárat, és újratöltés
nélkül vált nyelvet.

| # | Téma | Idő |
|---|---|---|
| 1 | A szótárak | 5' |
| 2 | Konfiguráció és `Accept-Language` interceptor | 5' |
| 3 | Nyelvváltó a navbaron | 3' |
| 4 | A `program` pipe | 2' |
| 5 | EmptyRow | 2' |
| 6 | Hallgatólista | 4' |
| 7 | Szerkesztő | 4' |
| | **Összesen** | **25'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

A szükséges csomagok (`@ngx-translate/core`, `@ngx-translate/http-loader`) már szerepelnek a
`package.json`-ban. Saját projektben:

```bash
npm install @ngx-translate/core @ngx-translate/http-loader
```

Futtatás:

```bash
cd neptun-pp && mvn spring-boot:run           # http://localhost:8083
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200
```

---

## 1. A szótárak (5')

Egymásba ágyazott kulcsok (`student.editTitle`), `{{param}}` helyőrzőkkel. A `public` mappa
tartalma a gyökérből érhető el, így ezek a `/i18n/hu.json` és `/i18n/en.json` címen töltődnek le.

**Hova:** `neptun-pp-ng/public/i18n/hu.json` – **új fájl**

```json
{
  "menu": {
    "students": "Hallgatók",
    "subjects": "Tárgyak",
    "enrollments": "Tárgyfelvételek"
  },
  "common": {
    "actions": "Műveletek",
    "create": "Létrehozás",
    "edit": "Módosítás",
    "delete": "Törlés",
    "save": "Mentés",
    "success": "Sikeres művelet!",
    "empty": "Nincs megjeleníthető {{entity}}!"
  },
  "program": {
    "CS_BSC": "Programtervező informatikus BSc",
    "CSE_BSC": "Mérnökinformatikus BSc",
    "BI_BSC": "Gazdaságinformatikus BSc"
  },
  "student": {
    "title": "Hallgatók",
    "entity": "hallgató",
    "createTitle": "Új hallgató",
    "editTitle": "{{name}} szerkesztése",
    "neptun": "Neptun-kód",
    "name": "Név",
    "program": "Szak",
    "chooseProgram": "Válassz szakot",
    "created": "Létrehozva",
    "updated": "Módosítva"
  }
}
```

Az angol fájl kulcsai pontosan ugyanazok, csak az értékek mások.

**Hova:** `neptun-pp-ng/public/i18n/en.json` – **új fájl**

```json
{
  "menu": {
    "students": "Students",
    "subjects": "Subjects",
    "enrollments": "Enrollments"
  },
  "common": {
    "actions": "Actions",
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "success": "Success!",
    "empty": "There is no {{entity}} to display!"
  },
  "program": {
    "CS_BSC": "Computer Science BSc",
    "CSE_BSC": "Computer Science Engineering BSc",
    "BI_BSC": "Business Informatics BSc"
  },
  "student": {
    "title": "Students",
    "entity": "student",
    "createTitle": "New student",
    "editTitle": "Edit {{name}}",
    "neptun": "Neptun code",
    "name": "Name",
    "program": "Program",
    "chooseProgram": "Choose a program",
    "created": "Created",
    "updated": "Updated"
  }
}
```

---

## 2. Konfiguráció és `Accept-Language` interceptor (5')

```bash
ng generate interceptor _service/accept-language --functional --skip-tests
```

### 2.1 Az interceptor

A backend a validációs üzeneteket (pl. „nem lehet üres”) a kérés `Accept-Language` fejléce
szerinti nyelven küldi (a Hibernate Validator magyarul és angolul is tud). Alapból a böngésző a
saját nyelvét küldi; egy **interceptor** minden kérésen lecseréli az éppen kiválasztott nyelvre.
Próba: angolra váltva töröld ki egy hallgató nevét, és ments.

**Hova:** `neptun-pp-ng/src/app/_service/accept-language-interceptor.ts` – **új fájl**

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Minden kéréshez hozzáadja az Accept-Language fejlécet a kiválasztott nyelvvel,
 * így a backend (Hibernate Validator) a validációs üzeneteket is ezen a nyelven küldi.
 */
export const acceptLanguageInterceptor: HttpInterceptorFn = (request, next) => {
  const lang = inject(TranslateService).getCurrentLang();
  return next(lang ? request.clone({ setHeaders: { 'Accept-Language': lang } }) : request);
};
```

### 2.2 Konfiguráció

Ennyi a teljes konfiguráció: honnan töltse a JSON-öket (`prefix`), melyik a kezdő nyelv
(`lang`), és mi legyen, ha egy kulcs hiányzik (`fallbackLang`). Az interceptort a
`provideHttpClient(withInterceptors([...]))` regisztrálja. A `useHttpBackend: true` miatt a JSON
szótárak letöltése megkerüli az interceptort; enélkül körkörös függés lenne: a
TranslateService a HttpClienttel tölt, az interceptor pedig a TranslateService-t kéri.

**Hova:** `neptun-pp-ng/src/app/app.config.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
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
```

---

## 3. Nyelvváltó a navbaron (3')

A `TranslateService.use(lang)` betölti az adott nyelv JSON-jét és átvált rá. A `getCurrentLang()`
megmondja, melyik az aktív, így azt a gombot kiemelhetjük.

**Hova:** `neptun-pp-ng/src/app/app.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.html',
})
export class App {
  protected readonly translate = inject(TranslateService);
  protected readonly languages = ['hu', 'en'];
}
```

A sablonban a sima szövegek helyére `{{ 'kulcs' | translate }}` kerül, a jobb oldalra pedig a
nyelvváltó gombok.

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
             [routerLinkActive]="'active'">{{ 'menu.students' | translate }}</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'subject'"
             [routerLinkActive]="'active'">{{ 'menu.subjects' | translate }}</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'enrollment'"
             [routerLinkActive]="'active'">{{ 'menu.enrollments' | translate }}</a>
        </li>
      </ul>

      <!-- Nyelvváltás: a translate.use() betölti a /i18n/<nyelv>.json fájlt -->
      <div class="btn-group btn-group-sm">
        @for (lang of languages; track lang) {
          <button type="button" class="btn btn-outline-light text-uppercase"
                  [class.active]="translate.getCurrentLang() === lang"
                  (click)="translate.use(lang)">
            {{ lang }}
          </button>
        }
      </div>
    </div>
  </div>
</nav>

<router-outlet />
```

---

## 4. A `program` pipe (2')

Eddig az `app.constants.ts` `programs` Map-jéből dolgozott, most az i18n JSON `program.*` ágából.
**`pure: false`** kell, mert nyelvváltáskor a bemenet (`CS_BSC`) nem változik, csak a fordítás,
és pure pipe-ot az Angular ilyenkor nem futtatna újra. (A `programs` Map kulcsait a szerkesztő
legördülő listája továbbra is használja.)

**Hova:** `neptun-pp-ng/src/app/_pipe/program-pipe.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Szakkód → szaknév, most már az i18n JSON-ök "program" ágából (pl. program.CS_BSC).
 * pure: false, mert nyelvváltáskor a bemenet (a kód) nem változik, csak a fordítás.
 */
@Pipe({
  name: 'program',
  pure: false,
})
export class ProgramPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(code: string): string {
    return this.translate.instant(`program.${code}`);
  }
}
```

---

## 5. EmptyRow (2')

Az `<ng-content>` helyett egy `entity` inputot kap (i18n kulcs, pl. `student.entity`). A
sablonban két fordítás ágyazódik egymásba: az entitás neve a mondat paramétere.

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * "Nincs megjeleníthető ..." sor egy üres táblázatba (tavalyi minta).
 * Attribútum szelektor (tr[empty]), mert a <tbody>-ban csak <tr> állhat,
 * egy saját <app-empty-row> elem érvénytelen HTML lenne.
 *
 *   @for (...) { ... } @empty {
 *     <tr empty [colSpan]="6" entity="student.entity"></tr>
 *   }
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe],
  selector: 'tr[empty]',
  styleUrl: './empty-row.scss',
  templateUrl: './empty-row.html',
})
export class EmptyRow {
  @Input({ required: true }) colSpan!: number;
  /** i18n kulcs az entitás nevére, pl. 'student.entity' → "hallgató" */
  @Input({ required: true }) entity!: string;
}
```

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<th [attr.colspan]="colSpan" class="table-warning">
  <div class="d-flex flex-row justify-content-center align-items-center">
    <i class="bi bi-emoji-smile-upside-down-fill me-2"
       [style.font-size.em]="1.5"></i>
    {{ 'common.empty' | translate: { entity: (entity | translate) } }}
  </div>
</th>
```

---

## 6. Hallgatólista (4')

A sikeres törlés üzenetét kódból fordítjuk: a `TranslateService.instant()` szinkron módon
adja vissza a lefordított szöveget (paraméterek is adhatók neki, mint a pipe-nak).

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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EmptyRow } from '../empty-row/empty-row';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DatePipe,
    ProgramPipe,
    SortPipe,
    RouterLink,
    TranslatePipe,
    EmptyRow,
    SortableThV1,
    SortableThV2,
  ],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);

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
        alert(this.translate.instant('common.success'));
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

A sablonban minden szöveg helyére kulcs kerül; a `title` attribútumokból property binding lesz
(`[title]="'common.create' | translate"`), mert a pipe csak kötésben működik.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">{{ 'student.title' | translate }}</span>
      <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
      <a class="btn btn-sm btn-dark m-1" [routerLink]="'create'"
         [title]="'common.create' | translate">
        <i class="bi bi-plus-lg"></i>
        <span class="d-none d-md-inline ms-1">{{ 'common.create' | translate }}</span>
      </a>
    </div>
    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <!-- v1: egyirányú kötés, a szülő order függvényét kapja -->
          <th sortable-v1 value="neptun" [orderBy]="orderBy" [desc]="desc" [order]="order">
            {{ 'student.neptun' | translate }}
          </th>
          <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">
            {{ 'student.name' | translate }}
          </th>
          <!-- v2: kétirányú kötés -->
          <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">
            {{ 'student.program' | translate }}
          </th>
          <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">
            {{ 'student.created' | translate }}
          </th>
          <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">
            {{ 'student.updated' | translate }}
          </th>
          <th>{{ 'common.actions' | translate }}</th>
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
                <button class="btn btn-sm btn-outline-danger m-1"
                        [title]="'common.delete' | translate"
                        (click)="deleteOne(student)">
                  <i class="bi bi-trash"></i>
                  <span class="d-none d-md-inline ms-1">{{ 'common.delete' | translate }}</span>
                </button>
                <a class="btn btn-sm btn-outline-primary m-1"
                   [title]="'common.edit' | translate"
                   [routerLink]="student.neptun">
                  <i class="bi bi-pencil"></i>
                  <span class="d-none d-md-inline ms-1">{{ 'common.edit' | translate }}</span>
                </a>
              </td>
            </tr>
          } @empty {
            <!-- ha a tömb üres, ez a sor jelenik meg; az entitás neve is i18n kulcs -->
            <tr empty [colSpan]="6" entity="student.entity"></tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## 7. Szerkesztő (4')

A `TranslatePipe` importja után a sablon minden szövege fordítható. A címben paraméteres
fordítás van: `'student.editTitle' | translate: { name: student.name }`.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ProgramPipe, TranslatePipe],
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
  private readonly translate = inject(TranslateService);

  protected student!: Student;

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
        alert(this.translate.instant('common.success'));
        if (this.isNew) {
          this.router.navigate(['/student', student.neptun], { replaceUrl: true });
        }
        this.student = student;
      },
      // a validációs hibák (400) a választott nyelven jönnek (Accept-Language)
      error: (err) => alert(JSON.stringify(err.error.errors ?? err.error)),
    });
  }

  protected readonly programs = programs;
}
```

> Mellékesen eltűnt a nem használt `JsonPipe` import is (a build `NG8113` figyelmeztetése).

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <!-- a hallgató aszinkron töltődik be: amíg nincs meg, ne próbáljuk kirajzolni -->
    @if (student) {
      <div class="card-header text-bg-primary">
        {{ isNew ? ('student.createTitle' | translate) : ('student.editTitle' | translate: { name: student.name }) }}
      </div>
      <div class="card-body">
        @if (!isNew) {
          <div class="form-floating my-2">
            <input id="neptun" class="form-control"
                   [(ngModel)]="student.neptun"
                   disabled>
            <label for="neptun">{{ 'student.neptun' | translate }}</label>
          </div>
        }

        <div class="form-floating my-2">
          <input id="name" class="form-control"
                 [(ngModel)]="student.name">
          <label for="name">{{ 'student.name' | translate }}</label>
        </div>

        <div class="form-floating my-2">
          <select id="program" class="form-select"
                  [(ngModel)]="student.program">
            <option value="" disabled>{{ 'student.chooseProgram' | translate }}</option>
            @for (program of programs.keys(); track $index) {
              <option [value]="program">{{ program | program }}</option>
            }
          </select>
          <label for="program">{{ 'student.program' | translate }}</label>
        </div>

        <button class="btn btn-outline-primary w-100"
                [title]="(isNew ? 'common.create' : 'common.save') | translate"
                (click)="save()">
          <i class="bi" [class.bi-plus-lg]="isNew" [class.bi-floppy]="!isNew"></i>
          <span class="d-none d-md-inline ms-1">{{ (isNew ? 'common.create' : 'common.save') | translate }}</span>
        </button>
      </div>
    }
  </div>
</div>
```

---

## Függelék

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

A specek már tartalmazzák a `provideTranslateService()` providert, ezért ezekhez nem kell nyúlni.

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-i18n`) van. A többi v11 változat ugyanebből a v10-es állapotból indul,
egymástól függetlenül.
