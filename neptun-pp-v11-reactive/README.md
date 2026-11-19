# Neptun++ v11-reactive – óraterv: átírás Angular signalokra (45 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3),
klasszikus, signal nélküli Angularral (`@Input`, `@Output`, `subscribe` + `markForCheck`,
`ngModel`, zone.js).
**Végállapot:** ez a mappa (`neptun-pp-v11-reactive`). A backendhez nem nyúlunk.

**Az óra célja:** ugyanazt a működést **signalokkal** megírni, és látni, mi lesz egyszerűbb:

| Klasszikus (v10) | Signalos (v11-reactive) |
|---|---|
| zone.js + `ChangeDetectionStrategy.Eager` | **zoneless** + `OnPush` (alapértelmezett) |
| `@Input() x` | `x = input()` / `input.required()` |
| `@Input() x` + `@Output() xChange` | `x = model()` |
| mező + `subscribe` + `cdr.markForCheck()` | `signal()`, `rxResource()` |
| pipe a sablonban, újraszámolás minden ciklusban | `computed()` |
| `ActivatedRoute.paramMap` + `switchMap` | route paraméter → `input()` (`withComponentInputBinding`) |
| `[(ngModel)]` + kézi validáció | **Signal Forms**: `form()`, `[formField]`, `required()`, `submit()` |

| # | Téma | Idő |
|---|---|---|
| 1 | Zoneless és OnPush | 5' |
| 2 | `input()`: EmptyRow, sortable-th v1 | 5' |
| 3 | `model()`: sortable-th v2 és v3 | 5' |
| 4 | Hallgatólista: `signal`, `computed`, `rxResource` | 10' |
| 5 | Szerkesztő: route input, `linkedSignal`, Signal Forms | 20' |
| | **Összesen** | **45'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

```bash
cd neptun-pp && mvn spring-boot:run           # http://localhost:8083
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200
```

---

## 1. Zoneless és OnPush (5')

**Mi az a signal?** Egy érték „dobozban”: `count = signal(0)`, kiolvasás: `count()`, írás:
`count.set(1)` vagy `count.update(c => c + 1)`. Ha egy sablon vagy egy `computed()` kiolvassa,
az Angular **megjegyzi a függőséget**, és csak akkor rajzol újra, ha a signal tényleg megváltozott.

**A zone.js** eddig minden aszinkron eseményt (kattintás, HTTP-válasz, `setTimeout`)
elkapott, és utána az egész komponensfát újraellenőrizte (`Eager`). OnPush mellett ezért
kellett a `cdr.markForCheck()`: a zone nem tudhatta, melyik komponens adata változott. Signalokkal
ezt az Angular pontosan tudja, így a **zone.js elhagyható** (kisebb bundle, gyorsabb, és a
hibakeresésnél sem zavar).

Az Angular 22-ben az `OnPush` az alapértelmezett, ezért a `changeDetection: ChangeDetectionStrategy.Eager`
sorok egyszerűen törlődnek a komponensekből. Az új komponensekhez se kérjük többé: az
`angular.json`-ból törölni kell a `"changeDetection": "Eager"` sort, és a `zone.js` polyfillt is.

**Hova:** `neptun-pp-ng/angular.json` – ezt a két részt módosítsd

```json
"schematics": {
  "@schematics/angular:component": {
    "style": "scss"
  }
},
```

```json
"polyfills": [
  "@angular/localize/init"
],
```

A `withComponentInputBinding()` az 5. lépéshez kell: a route paraméterei (pl. `:neptun`)
a komponens azonos nevű `input()`-jába kerülnek.

**Hova:** `neptun-pp-ng/src/app/app.config.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // nincs zone.js: a változásokat a signalok (és a sablon eseményei) jelzik
    provideZonelessChangeDetection(),
    provideHttpClient(),
    // a route paraméterei (pl. :neptun) a komponens input()-jaiba kerülnek
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

**Hova:** `neptun-pp-ng/src/app/app.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {}
```

---

## 2. `input()`: EmptyRow, sortable-th v1 (5')

Az `input()` egy **csak olvasható signal**, amit a szülő tölt ki. A `!` (definite assignment)
trükk eltűnik, a kötelező inputot a fordító ellenőrzi (`input.required`), és a sablonban
függvényként olvassuk: `colSpan()`.

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, input } from '@angular/core';

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
  selector: 'tr[empty]',
  styleUrl: './empty-row.scss',
  templateUrl: './empty-row.html',
})
export class EmptyRow {
  readonly colSpan = input.required<number>();
}
```

**Hova:** `neptun-pp-ng/src/app/_component/empty-row/empty-row.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<th [attr.colspan]="colSpan()" class="table-warning">
  <div class="d-flex flex-row justify-content-center align-items-center">
    <i class="bi bi-emoji-smile-upside-down-fill me-2"
       [style.font-size.em]="1.5"></i>
    Nincs megjeleníthető <ng-content></ng-content>!
  </div>
</th>
```

A v1 fejléc ugyanígy: minden adat `input()`-on jön lefelé, a függvény is. A sablonban az
`order()` a signal kiolvasása (a függvény maga), az `order()(value())` pedig a meghívása.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v1/sortable-th-v1.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, input } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v1: EGYIRÁNYÚ kötés (a tavalyi megoldás), signalos inputokkal.
 * Minden adat inputon jön lefelé, a rendezést végző függvényt is a szülő adja át:
 *
 *   <th sortable-v1 value="name" [orderBy]="orderBy()" [desc]="desc()" [order]="order">Név</th>
 */
@Component({
  selector: 'th[sortable-v1]',
  styleUrl: './sortable-th-v1.scss',
  templateUrl: './sortable-th-v1.html',
})
export class SortableThV1 {
  readonly value = input.required<Student.Key>();
  readonly orderBy = input<Student.Key>();
  readonly desc = input(false);
  readonly order = input.required<(value: Student.Key) => void>();
}
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v1/sortable-th-v1.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div (click)="order()(value())">
  <ng-content></ng-content>
  @if (orderBy() === value()) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!desc()"
       [class.bi-sort-down]="desc()"></i>
  }
</div>
```

---

## 3. `model()`: sortable-th v2 és v3 (5')

A `model()` egy **írható** input: a komponens `set()`-tel vagy `update()`-tel módosíthatja,
és a változást a szülő is megkapja. Pontosan ugyanazt tudja, mint az `@Input() x` +
`@Output() xChange` páros, ezért a szülőben továbbra is `[(orderBy)]` a kötés, csak most
egy **signalt** köthetünk bele: `[(orderBy)]="orderBy"` (zárójel nélkül!).

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v2/sortable-th-v2.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, input, model } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v2: KÉTIRÁNYÚ kötés ("banana in a box") model()-lel.
 * A model() = @Input x + @Output xChange egyben; a szülő egy signalt köthet bele:
 *
 *   <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
 */
@Component({
  selector: 'th[sortable-v2]',
  styleUrl: './sortable-th-v2.scss',
  templateUrl: './sortable-th-v2.html',
})
export class SortableThV2 {
  readonly value = input.required<Student.Key>();
  readonly orderBy = model<Student.Key>();
  readonly desc = model(false);

  protected click(): void {
    if (this.orderBy() === this.value()) {
      this.desc.update((desc) => !desc);
    } else {
      this.orderBy.set(this.value());
      this.desc.set(false);
    }
  }
}
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v2/sortable-th-v2.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div (click)="click()">
  <ng-content></ng-content>
  @if (orderBy() === value()) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!desc()"
       [class.bi-sort-down]="desc()"></i>
  }
</div>
```

A v3 konténer-direktívája is `model()`-t kap. A fejlécek DI-vel érik el; mivel a
`table.sort()` egy signal, a fejléc magától frissül, ha a rendezés megváltozik.

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-table.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Directive, model } from '@angular/core';

/** A rendezés állapota egy objektumban: mi szerint és milyen irányban. */
export interface Sort<T> {
  orderBy: keyof T;
  desc: boolean;
}

/**
 * v3 (generikus), 1. rész: a közös ős (pl. a táblázat) tárolja a rendezés állapotát.
 * Kétirányúan köthető: <table sortable-table [(sort)]="sort">
 *
 * A th[sortable-v3] fejlécek DI-vel (inject) megtalálják ezt a direktívát.
 */
@Directive({
  selector: '[sortable-table]',
})
export class SortableTable<T> {
  readonly sort = model<Sort<T>>();

  toggle(orderBy: keyof T): void {
    this.sort.update((sort) => ({
      orderBy,
      desc: sort?.orderBy === orderBy ? !sort.desc : false,
    }));
  }
}
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-th-v3.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, inject, input } from '@angular/core';
import { SortableTable } from './sortable-table';

/**
 * v3 (generikus), 2. rész: a fejléc. Nincs Student-hez kötve, bármilyen T-re működik.
 *
 *   <table sortable-table [(sort)]="sort">
 *     <th sortable-v3="name">Név</th>
 *
 * Az állapotot nem inputon kapja, hanem a legközelebbi [sortable-table] őstől (DI).
 */
@Component({
  selector: 'th[sortable-v3]',
  styleUrl: './sortable-th-v3.scss',
  templateUrl: './sortable-th-v3.html',
})
export class SortableThV3<T> {
  readonly value = input.required<keyof T>({ alias: 'sortable-v3' });

  protected readonly table = inject<SortableTable<T>>(SortableTable);
}
```

**Hova:** `neptun-pp-ng/src/app/_component/sortable-th-v3/sortable-th-v3.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div (click)="table.toggle(value())">
  <ng-content></ng-content>
  @if (table.sort()?.orderBy === value()) {
    <i class="bi float-end"
       [class.bi-sort-down-alt]="!table.sort()?.desc"
       [class.bi-sort-down]="table.sort()?.desc"></i>
  }
</div>
```

---

## 4. Hallgatólista: `signal`, `computed`, `rxResource` (10')

### 4.1 A rendezés függvényként

A rendezést kiemeljük egy sima függvénybe, hogy egy `computed()`-ból is hívható legyen. A
pipe megmarad (máshol még jól jöhet), de ő is ezt hívja.

**Hova:** `neptun-pp-ng/src/app/_pipe/sort-pipe.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Pipe, PipeTransform } from '@angular/core';

/** Generikus rendezés: új tömböt ad vissza, az eredetit nem rendezi át. */
export function sortBy<T>(items: readonly T[] | undefined, orderBy?: keyof T, desc = false): T[] {
  if (!items || !orderBy) {
    return [...(items ?? [])];
  }
  return [...items].sort((a, b) => {
    if (a[orderBy] == b[orderBy]) {
      return 0;
    }
    return (a[orderBy] < b[orderBy] ? -1 : 1) * (desc ? -1 : 1);
  });
}

/**
 * Ugyanez pipe-ként:
 *   @for (s of students | sort: orderBy : desc; track s.neptun) { ... }
 */
@Pipe({
  name: 'sort',
})
export class SortPipe implements PipeTransform {
  transform<T>(items: readonly T[] | undefined, orderBy?: keyof T, desc = false): T[] {
    return sortBy(items, orderBy, desc);
  }
}
```

### 4.2 A komponens

* **`rxResource`**: egy Observable-t (itt a `findAll()`-t) signallá alakít, és a betöltés
  állapotát is adja: `isLoading()`, `error()`, `hasValue()`, `value()`. Nincs `ngOnInit`, nincs
  `subscribe`, nincs `markForCheck`. Az értéke írható (`update()`), így törlés után sem kell
  újratölteni.
* **`signal`**: a rendezés állapota (`orderBy`, `desc`).
* **`computed`**: a rendezett lista; csak akkor számolódik újra, ha a lista vagy a rendezés
  megváltozik (a pipe-nál ezt a pipe tisztasága biztosította).

> A `value()` hibaállapotban kivételt dob, ezért a `computed` előbb a `hasValue()`-t kérdezi meg.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { sortBy } from '../../_pipe/sort-pipe';
import { EmptyRow } from '../empty-row/empty-row';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  imports: [DatePipe, ProgramPipe, RouterLink, EmptyRow, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList {
  private readonly client = inject(StudentClient);

  /** Observable → signal, a betöltés állapotával együtt (isLoading, error, value) */
  protected readonly students = rxResource({
    stream: () => this.client.findAll(),
    defaultValue: [],
  });

  protected readonly orderBy = signal<Student.Key | undefined>(undefined);
  protected readonly desc = signal(false);

  /** Csak akkor számolódik újra, ha a lista vagy a rendezés változik */
  protected readonly sortedStudents = computed(() =>
    sortBy(this.students.hasValue() ? this.students.value() : [], this.orderBy(), this.desc()),
  );

  /** v1 (egyirányú) fejlécnek átadott függvény. Arrow function, hogy a `this` megmaradjon! */
  protected readonly order = (value: Student.Key): void => {
    if (this.orderBy() === value) {
      this.desc.update((desc) => !desc);
    } else {
      this.orderBy.set(value);
      this.desc.set(false);
    }
  };

  protected deleteOne(student: Student): void {
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        alert('Success');
        // a resource értéke írható: nem kell újratölteni, és markForCheck sem kell
        this.students.update((students) => students.filter((s) => s.neptun !== student.neptun));
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

A sablonban a signalokat függvényként olvassuk; a v2 kétirányú kötésébe viszont magát a
signalt adjuk át, zárójel nélkül. Az `rxResource` állapotából betöltésjelzőt és hibasort is
kapunk.

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
          <!-- v1: egyirányú kötés: a signal ÉRTÉKÉT adjuk át -->
          <th sortable-v1 value="neptun" [orderBy]="orderBy()" [desc]="desc()" [order]="order">Neptun-kód</th>
          <th sortable-v1 value="name" [orderBy]="orderBy()" [desc]="desc()" [order]="order">Név</th>
          <!-- v2: kétirányú kötés (model): MAGÁT a signalt kötjük be, zárójel nélkül -->
          <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
          <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">Létrehozva</th>
          <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">Módosítva</th>
          <th>Műveletek</th>
        </tr>
        </thead>
        <tbody>
          @if (students.isLoading()) {
            <tr>
              <td colspan="6" class="text-center">
                <span class="spinner-border spinner-border-sm me-1"></span>Betöltés...
              </td>
            </tr>
          } @else if (students.error()) {
            <tr>
              <td colspan="6" class="table-danger text-center">Nem sikerült betölteni a hallgatókat.</td>
            </tr>
          } @else {
            @for (student of sortedStudents(); track student.neptun) {
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
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## 5. Szerkesztő: route input, `linkedSignal`, Signal Forms (20')

### 5.1 Az üres hallgató

A Signal Forms a modell **mezőiből** építi fel az űrlapot, ezért az üres hallgatónak is
legyenek mezői (eddig `{}` volt).

**Hova:** `neptun-pp-ng/src/app/_model/student.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
export interface Student {
  neptun: string;
  name: string;
  program: string;
  created: string;
  updated: string;
}

export namespace Student {
  export type Key = keyof Student;

  /** Új hallgató: a Signal Forms a mezőkből építi fel az űrlapot, ezért legyenek meg */
  export function empty(): Student {
    return { neptun: '', name: '', program: '' } as Student;
  }

  export const keys: readonly Student.Key[] = [
    'neptun', 'name', 'program', 'created', 'updated'
  ];
}
```

### 5.2 A komponens

A lánc:

1. **`neptun = input<string>()`**: a `withComponentInputBinding()` miatt a route `:neptun`
   paramétere ide kerül (új hallgatónál `undefined`). Nincs többé `ActivatedRoute`,
   `paramMap`, `switchMap`.
2. **`loaded = rxResource({ params, stream })`**: a `params` signalokból áll össze; ha
   változik (másik hallgatóra navigálunk), a `stream` magától újra lefut, az előző kérést pedig
   megszakítja.
3. **`student = linkedSignal(...)`**: a betöltött értékből indul, de **írható** (az űrlap
   ebbe ír). Ha a `loaded` megváltozik, a `linkedSignal` is újraindul belőle. (Egy sima
   `computed` nem lenne írható, egy sima `signal` pedig nem követné a betöltést.)
4. **`studentForm = form(student, schema)`**: a **Signal Forms** űrlap. A séma ugyanazokat
   a szabályokat írja le, mint a backend (`@NotBlank`, `@Size(3–100)`, `@NotNull`), így a
   hibák már beküldés előtt látszanak. Minden mező állapota signal:
   `studentForm.name().value()`, `.invalid()`, `.touched()`, `.errors()`.
5. **`submit(form, action)`**: minden mezőt „érintettnek” jelöl (megjelennek a hibák), és
   csak érvényes űrlapnál futtatja az `action`-t. Az `action` visszatérési értéke **szerveroldali
   hibák** listája lehet: a backend 400-as válaszának mezőnkénti hibáit így a megfelelő mező
   alá tesszük.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom, of } from 'rxjs';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  imports: [FormField, ProgramPipe],
  selector: 'app-student-edit',
  styleUrl: './student-edit.scss',
  templateUrl: './student-edit.html',
})
export class StudentEdit {
  private readonly client = inject(StudentClient);
  private readonly router = inject(Router);

  /** A route :neptun paramétere (withComponentInputBinding); új hallgatónál undefined */
  readonly neptun = input<string>();

  /** Betöltés: ha a neptun változik, magától újra lefut */
  protected readonly loaded = rxResource({
    params: () => ({ neptun: this.neptun() }),
    stream: ({ params }) =>
      params.neptun ? this.client.findOne(params.neptun) : of(Student.empty()),
  });

  /** A szerkesztett hallgató: a betöltött értékből indul, de írható (ebbe ír az űrlap) */
  protected readonly student = linkedSignal(() =>
    this.loaded.hasValue() ? this.loaded.value() : Student.empty(),
  );

  /** Signal Forms: ugyanazok a szabályok, mint a backenden (@NotBlank, @Size, @NotNull) */
  protected readonly studentForm = form(this.student, (path) => {
    required(path.name, { message: 'A név megadása kötelező.' });
    minLength(path.name, 3, { message: 'A név legalább 3 karakter.' });
    maxLength(path.name, 100, { message: 'A név legfeljebb 100 karakter.' });
    required(path.program, { message: 'Válassz szakot!' });
  });

  protected readonly isNew = computed(() => !this.student().neptun);

  protected save(): void {
    // csak érvényes űrlapnál fut; a visszaadott hibák a megfelelő mező alá kerülnek
    submit(this.studentForm, async () => {
      const isNew = this.isNew();
      try {
        const saved = await firstValueFrom(
          isNew ? this.client.createOne(this.student()) : this.client.updateOne(this.student()),
        );
        alert('Success');
        if (isNew) {
          await this.router.navigate(['/student', saved.neptun], { replaceUrl: true });
        } else {
          this.student.set(saved);
        }
        return undefined;
      } catch (error) {
        // 400: a backend mezőnkénti hibái, pl. { "name": "nem lehet üres" }
        const errors: Record<string, string> = (error as HttpErrorResponse).error?.errors ?? {};
        return Object.entries(errors).map(([field, message]) => ({
          kind: 'server',
          message,
          fieldTree: this.studentForm[field as 'name' | 'program'],
        }));
      }
    });
  }

  protected readonly programs = programs;
}
```

### 5.3 A sablon

* `[formField]="studentForm.name"`: összeköti a mezőt az input elemmel (érték, `disabled`,
  `touched`, ...), az `ngModel` helyett;
* `is-invalid` + `invalid-feedback`: a Bootstrap hibás mező stílusa, csak ha a mező már
  „érintett” (elhagytuk, vagy próbáltunk menteni);
* a fejléc (`Edit ${student().name}`) gépelés közben is frissül, mert a `student` signal változik;
* a betöltés állapota (`loaded.isLoading()`, `loaded.error()`) a resource-ból jön: nem létező
  Neptun-kódnál (404) hibaüzenet jelenik meg.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    @if (loaded.isLoading()) {
      <div class="card-body text-center">
        <span class="spinner-border spinner-border-sm me-1"></span>Betöltés...
      </div>
    } @else if (loaded.error()) {
      <div class="card-body">
        <div class="alert alert-danger m-0">Nincs ilyen hallgató.</div>
      </div>
    } @else {
      <div class="card-header text-bg-primary">
        {{ isNew() ? 'Create Student' : `Edit ${student().name}` }}
      </div>
      <div class="card-body">
        @if (!isNew()) {
          <div class="form-floating my-2">
            <input id="neptun" class="form-control" [value]="student().neptun" disabled>
            <label for="neptun">Neptun-code</label>
          </div>
        }

        <div class="form-floating my-2">
          <input id="name" class="form-control"
                 [formField]="studentForm.name"
                 [class.is-invalid]="studentForm.name().touched() && studentForm.name().invalid()">
          <label for="name">Name</label>
          @for (error of studentForm.name().errors(); track $index) {
            <div class="invalid-feedback">{{ error.message }}</div>
          }
        </div>

        <div class="form-floating my-2">
          <select id="program" class="form-select"
                  [formField]="studentForm.program"
                  [class.is-invalid]="studentForm.program().touched() && studentForm.program().invalid()">
            <option value="" disabled>Choose a program</option>
            @for (program of programs.keys(); track $index) {
              <option [value]="program">{{ program | program }}</option>
            }
          </select>
          <label for="program">Program</label>
          @for (error of studentForm.program().errors(); track $index) {
            <div class="invalid-feedback">{{ error.message }}</div>
          }
        </div>

        <button class="btn btn-outline-primary w-100"
                [title]="isNew() ? 'Create' : 'Update'"
                [disabled]="studentForm().submitting()"
                (click)="save()">
          <i class="bi" [class.bi-plus-lg]="isNew()" [class.bi-floppy]="!isNew()"></i>
          <span class="d-none d-md-inline ms-1">{{ isNew() ? 'Create' : 'Update' }}</span>
        </button>
      </div>
    }
  </div>
</div>
```

Próba:

1. új hallgatónál üres névvel a „Create”: a mezők pirosak, a backend meg sem kapja a kérést;
2. a kliensoldali `minLength` sort ideiglenesen kikommentezve, két karakteres névvel a backend
   400-at ad, és az üzenete („3 és 100 között kell lennie”) a Név mező alatt jelenik meg;
3. `http://localhost:4200/student/NINCSILYEN`: „Nincs ilyen hallgató.”

---

## Függelék

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-reactive`) van. A többi v11 változat
ugyanebből a v10-es állapotból indul, egymástól függetlenül.

### Továbblépési lehetőségek

* `httpResource()`: az `rxResource` + `HttpClient` páros rövidebb formája (egy URL-ből
  közvetlenül signalt ad);
* a `StudentClient` metódusai is visszaadhatnának resource-ot;
* `effect()`: mellékhatás signal változásra (pl. a rendezés mentése a `localStorage`-ba).
