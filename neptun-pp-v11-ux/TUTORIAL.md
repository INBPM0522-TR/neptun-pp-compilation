# Neptun++ v11-ux – óraterv: újrafelhasználható lista, új oldalak, modalok, hibák (55 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-ux`).

**Az óra célja**, csak a frontenden:

* **újrafelhasználhatóság**: a StudentList kártyáját `ng-template`-ekkel paraméterezhető
  `ListCard`-dá emeljük ki, így a SubjectList és az EnrollmentList már pár sorból összeáll;
* **modalok**: a tavalyi, rejtett gombos Bootstrap modal és az ng-bootstrap `NgbModal`;
* a backend **hibáinak és validációs üzeneteinek megjelenítése** `alert()` helyett.

Az i18n (ngx-translate) **nem** része ennek a változatnak, a feliratok magyarul vannak beégetve
(az i18n a `neptun-pp-v11-i18n` mappában van).

| # | Téma | Idő |
|---|---|---|
| 1 | Újrafelhasználható `ListCard` (ng-template) | 15' |
| 2 | SubjectList és EnrollmentList | 10' |
| 3 | Modalok: rejtett gomb és `NgbModal` | 15' |
| 4 | Hibák megjelenítése: `ErrorAlert` | 15' |
| | **Összesen** | **55'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni. Az új komponenseket érdemes
`ng generate`-tel létrehozni (a parancsok a lépések elején vannak), majd a generált fájlok
tartalmát lecserélni a megadott kódra.

```bash
cd neptun-pp && mvn spring-boot:run           # http://localhost:8083
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200
```

---

## 1. Újrafelhasználható `ListCard` (ng-template) (15')

```bash
ng generate component _component/list-card --skip-tests
```

### 1.1 A komponens

A hallgatólista kártyája (fejléc, táblázat, EmptyRow) a tárgy- és a tárgyfelvétel-listán is
ugyanígy kellene. Ezért kiemeljük egy komponensbe, a **változó részeket** (a fejléc celláit
és egy sort) pedig a használó adja **`ng-template`**-ként. A `@ContentChild('row')` a komponens
**tartalmában** (amit a használó a tagek közé írt) keresi a `#row` nevű sablont.

**Hova:** `neptun-pp-ng/src/app/_component/list-card/list-card.ts` – **új fájl**

```ts
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EmptyRow } from '../empty-row/empty-row';

/**
 * Újrahasznosítható listázó kártya: a keret (kártya, cím, táblázat, "nincs adat" sor)
 * itt van EGYSZER megírva, a változó részeket a használó adja ng-template-ként:
 *
 *   <app-list-card title="Tárgyak" entity="tárgy" [items]="subjects" [columns]="3">
 *     <ng-template #header> <th>...</th> </ng-template>
 *     <ng-template #row let-subject> <td>{{ subject.name }}</td> </ng-template>
 *   </app-list-card>
 *
 * ng-content vs. ng-template: az ng-content egyszer vetíti be a tartalmat
 * (ezt használjuk a fejléc gombjaihoz: [actions]), a sablont viszont soronként,
 * paraméterezve (let-subject) újra és újra ki tudjuk rajzolni.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgTemplateOutlet, EmptyRow],
  selector: 'app-list-card',
  styleUrl: './list-card.scss',
  templateUrl: './list-card.html',
})
export class ListCard<T> {
  @Input({ required: true }) title!: string;
  @Input() items: T[] = [];
  /** A "nincs adat" sor (EmptyRow) ennyi oszlopot fog át. */
  @Input() columns = 1;
  /** Az entitás neve a "Nincs megjeleníthető ..." sorhoz, pl. 'hallgató' */
  @Input({ required: true }) entity!: string;

  @ContentChild('header') protected header?: TemplateRef<unknown>;
  @ContentChild('row') protected row?: TemplateRef<unknown>;
}
```

### 1.2 A sablon

Az `*ngTemplateOutlet` kirajzolja a kapott sablont. A sorsablont minden elemre újra kirajzolja,
és a `context`-ben átadja neki az aktuális elemet. Az egyszeri tartalom (a „Létrehozás” gomb)
`<ng-content select="[actions]">`-szel kerül a kártya fejlécébe.

**Hova:** `neptun-pp-ng/src/app/_component/list-card/list-card.html` – **új fájl**

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">{{ title }}</span>
      <!-- egyszeri tartalom (pl. Létrehozás gomb): ng-content -->
      <ng-content select="[actions]"></ng-content>
    </div>

    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <ng-container *ngTemplateOutlet="header ?? null"></ng-container>
        </tr>
        </thead>
        <tbody>
          @for (item of items; track $index) {
            <tr>
              <!-- soronként ismétlődő tartalom: ng-template + kontextus -->
              <ng-container *ngTemplateOutlet="row ?? null; context: { $implicit: item }"></ng-container>
            </tr>
          } @empty {
            <tr empty [colSpan]="columns">{{ entity }}</tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

| | `<ng-content>` | `<ng-template>` + `ngTemplateOutlet` |
|---|---|---|
| Hányszor jelenik meg? | egyszer | tetszőleges sokszor (soronként) |
| Paraméterezhető? | nem | igen: `let-student` = a kontextus `$implicit` mezője |
| Itt mire használjuk? | „Létrehozás” gomb | fejléc, sorok |

### 1.3 A hallgatólista átírása

Az `EmptyRow` helyett most a `ListCard`-ot importáljuk, mert az EmptyRow-t már a ListCard használja.

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
import { ListCard } from '../list-card/list-card';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, ListCard, SortableThV1, SortableThV2],
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

A sablonból csak az marad, ami **tényleg a hallgatókra jellemző**: a fejléc cellái és egy sor.
A `let-student` jelenti azt, hogy a kontextus `$implicit` értékét `student` néven érjük el.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<app-list-card title="Hallgatók"
               entity="hallgató"
               [items]="students | sort: orderBy : desc"
               [columns]="6">

  <!-- ng-content: egyszeri tartalom a kártya fejlécébe -->
  <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
  <a actions class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
    <i class="bi bi-plus-lg"></i>
    <span class="d-none d-md-inline ms-1">Létrehozás</span>
  </a>

  <ng-template #header>
    <!-- v1: egyirányú kötés, a szülő order függvényét kapja -->
    <th sortable-v1 value="neptun" [orderBy]="orderBy" [desc]="desc" [order]="order">Neptun-kód</th>
    <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
    <!-- v2: kétirányú kötés -->
    <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
    <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">Létrehozva</th>
    <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">Módosítva</th>
    <th>Műveletek</th>
  </ng-template>

  <ng-template #row let-student>
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
  </ng-template>
</app-list-card>
```

> Ami elveszett: a `BI_BSC` sorok piros háttere (`[class.table-danger]`), mert a `<tr>`-t most
> a `ListCard` rajzolja. Ha kell, egy `rowClass` inputtal visszahozható (jó gyakorlófeladat).

---

## 2. SubjectList és EnrollmentList (10')

```bash
ng generate interface _model/subject
ng generate interface _model/enrollment
ng generate service _service/subject-client --skip-tests
ng generate service _service/enrollment-client --skip-tests
ng generate component _component/subject-list --skip-tests
ng generate component _component/enrollment-list --skip-tests
```

Ez a lépés mutatja meg, mennyit nyertünk: a két új lista szinte csak összerakás.

### 2.1 Modellek

A backend JSON-jének megfelelő interfészek. A tárgyfelvétel a teljes hallgató és tárgy
objektumot tartalmazza.

**Hova:** `neptun-pp-ng/src/app/_model/subject.ts` – **új fájl**

```ts
export interface Subject {
  code: string;
  name: string;
  credits: number;
  limit: number;
  program: string;
  created: string;
  updated: string;
}
```

**Hova:** `neptun-pp-ng/src/app/_model/enrollment.ts` – **új fájl**

```ts
import { Student } from './student';
import { Subject } from './subject';

export interface Enrollment {
  id: string;
  student: Student;
  subject: Subject;
  grade?: number;
  created: string;
  updated: string;
}
```

### 2.2 Kliensek

Ugyanaz a minta, mint a `StudentClient`-nél, csak listázásra.

**Hova:** `neptun-pp-ng/src/app/_service/subject-client.ts` – **új fájl**

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject } from '../_model/subject';

@Injectable({
  providedIn: 'root',
})
export class SubjectClient {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = '/api/subject';

  public findAll(): Observable<Subject[]> {
    return this.httpClient.get<Subject[]>(this.baseUrl);
  }
}
```

**Hova:** `neptun-pp-ng/src/app/_service/enrollment-client.ts` – **új fájl**

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Enrollment } from '../_model/enrollment';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentClient {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = '/api/enrollment';

  public findAll(): Observable<Enrollment[]> {
    return this.httpClient.get<Enrollment[]>(this.baseUrl);
  }
}
```

### 2.3 SubjectList

A komponens csak betölti az adatot; a rendezés állapotát egy `Sort<Subject>` objektum tárolja (v3).

**Hova:** `neptun-pp-ng/src/app/_component/subject-list/subject-list.ts` – **új fájl**

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Subject } from '../../_model/subject';
import { SubjectClient } from '../../_service/subject-client';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ProgramPipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-subject-list',
  styleUrl: './subject-list.scss',
  templateUrl: './subject-list.html',
})
export class SubjectList implements OnInit {
  private readonly client = inject(SubjectClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected subjects: Subject[] = [];
  protected sort?: Sort<Subject>;

  ngOnInit(): void {
    this.client.findAll().subscribe((data) => {
      this.subjects = data;
      this.cdr.markForCheck();
    });
  }
}
```

A `[sortable-table]` direktíva az `<app-list-card>` elemen ül, a `th[sortable-v3]` fejlécek
mégis megtalálják, pedig a ListCard belsejében rajzolódnak ki. Ennek oka, hogy egy
`ng-template` a DI szempontjából **ott „él”, ahol deklaráltuk**, nem ott, ahol megjelenik.

**Hova:** `neptun-pp-ng/src/app/_component/subject-list/subject-list.html` – **új fájl**

```html
<!-- v3: a [sortable-table] tárolja a rendezést, a th[sortable-v3] fejlécek DI-vel érik el -->
<app-list-card sortable-table [(sort)]="sort"
               title="Tárgyak"
               entity="tárgy"
               [items]="subjects | sort: sort?.orderBy : sort?.desc"
               [columns]="5">

  <ng-template #header>
    <th sortable-v3="code">Kód</th>
    <th sortable-v3="name">Név</th>
    <th sortable-v3="credits">Kredit</th>
    <th sortable-v3="limit">Létszámkorlát</th>
    <th sortable-v3="program">Szak</th>
  </ng-template>

  <ng-template #row let-subject>
    <td><code class="badge text-bg-dark">{{ subject.code }}</code></td>
    <td>{{ subject.name }}</td>
    <td>{{ subject.credits }}</td>
    <td>{{ subject.limit }}</td>
    <td>{{ subject.program | program }}</td>
  </ng-template>
</app-list-card>
```

### 2.4 EnrollmentList

Ugyanez `Enrollment` típussal. Csak a TS fájl és a két sablon tartalma más.

**Hova:** `neptun-pp-ng/src/app/_component/enrollment-list/enrollment-list.ts` – **új fájl**

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Enrollment } from '../../_model/enrollment';
import { EnrollmentClient } from '../../_service/enrollment-client';
import { SortPipe } from '../../_pipe/sort-pipe';
import { datetimeFormat } from '../../app.constants';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-enrollment-list',
  styleUrl: './enrollment-list.scss',
  templateUrl: './enrollment-list.html',
})
export class EnrollmentList implements OnInit {
  private readonly client = inject(EnrollmentClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected enrollments: Enrollment[] = [];
  protected sort?: Sort<Enrollment>;

  ngOnInit(): void {
    this.client.findAll().subscribe((data) => {
      this.enrollments = data;
      this.cdr.markForCheck();
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

A `student` és a `subject` objektum, ezért ezek szerint nem rendezünk; a `grade` és a
`created` oszlop rendezhető.

**Hova:** `neptun-pp-ng/src/app/_component/enrollment-list/enrollment-list.html` – **új fájl**

```html
<!-- Ugyanaz a ListCard és ugyanaz a generikus (v3) rendezés, csak más típussal: Enrollment -->
<app-list-card sortable-table [(sort)]="sort"
               title="Tárgyfelvételek"
               entity="tárgyfelvétel"
               [items]="enrollments | sort: sort?.orderBy : sort?.desc"
               [columns]="4">

  <ng-template #header>
    <!-- a student és subject objektum, ezek szerint nem rendezünk -->
    <th>Hallgató</th>
    <th>Tárgy</th>
    <th sortable-v3="grade">Jegy</th>
    <th sortable-v3="created">Felvéve</th>
  </ng-template>

  <ng-template #row let-enrollment>
    <td>
      <code class="badge text-bg-dark">{{ enrollment.student.neptun }}</code>
      {{ enrollment.student.name }}
    </td>
    <td>
      <code class="badge text-bg-secondary">{{ enrollment.subject.code }}</code>
      {{ enrollment.subject.name }}
    </td>
    <td>{{ enrollment.grade }}</td>
    <td>{{ enrollment.created | date: datetimeFormat }}</td>
  </ng-template>
</app-list-card>
```

### 2.5 Útvonalak

A navbar linkjei (`subject`, `enrollment`) most már valódi oldalra visznek.

**Hova:** `neptun-pp-ng/src/app/app.routes.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';
import { SubjectList } from './_component/subject-list/subject-list';
import { EnrollmentList } from './_component/enrollment-list/enrollment-list';

export const routes: Routes = [
  {
    path: 'student',
    component: StudentList
  },
  {
    path: 'student/create',
    component: StudentEdit
  },
  {
    path: 'student/:neptun',
    component: StudentEdit
  },
  {
    path: 'subject',
    component: SubjectList
  },
  {
    path: 'enrollment',
    component: EnrollmentList
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
```

---

## 3. Modalok: rejtett gomb és `NgbModal` (15')

```bash
ng generate component _component/confirm-dialog --skip-tests
```

### 3.1 Rejtett gombbal (tavalyi): sikeres mentés

A Bootstrap JS a `data-bs-*` attribútumokat figyeli: egy `data-bs-toggle="modal"` gombra
kattintva megnyitja a `data-bs-target`-ben megadott modalt. Kódból ezért egy **rejtett gombot
„nyomunk meg”** (`@ViewChild` + `.click()`), majd 3 mp múlva a bezáró gombot is. Új hallgató
létrehozásakor nincs modal, mert ilyenkor átnavigálunk a szerkesztő oldalra.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, of, switchMap, tap } from 'rxjs';
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

  protected student!: Student;

  /** Tavalyi megoldás: rejtett gombokkal nyitjuk/zárjuk a Bootstrap modalt. */
  @ViewChild('openModal') private openModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('closeModal') private closeModal!: ElementRef<HTMLButtonElement>;

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
    if (this.isNew) {
      // új hallgató → átnavigálunk a szerkesztő oldalára
      this.client.createOne(this.student).subscribe((student) =>
        this.router.navigate(['/student', student.neptun], { replaceUrl: true }),
      );
      return;
    }

    this.client
      .updateOne(this.student)
      .pipe(
        tap((student) => (this.student = student)),
        tap(() => this.openModal.nativeElement.click()), // rejtett gomb → modal megnyílik
        delay(3000),
        tap(() => this.closeModal.nativeElement.click()), // 3 mp múlva bezárjuk
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected readonly programs = programs;
}
```

A sablon végére kerül a rejtett nyitógomb és maga a modal. A bezáró gomb `data-bs-dismiss="modal"`,
és `#closeModal` néven a kódból is elérjük.

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

<!-- Tavalyi megoldás: rejtett gomb, ami a data-bs-* attribútumokkal nyitja a modalt.
     A kódból a gomb .click()-jét hívjuk (lásd student-edit.ts). -->
<button #openModal type="button" class="d-none"
        data-bs-toggle="modal" data-bs-target="#savedModal"></button>

<div class="modal fade" id="savedModal" tabindex="-1" aria-labelledby="savedModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="alert alert-success m-0">
        <h1 class="modal-title fs-5" id="savedModalLabel">Sikeres mentés!</h1>
        <p>A módosításokat elmentettük, tovább szerkesztheted a hallgatót.</p>
        <button #closeModal type="button" class="btn btn-success btn-sm w-100" data-bs-dismiss="modal"
                title="Bezárás">
          <i class="bi bi-x-lg"></i>
          <span class="d-none d-md-inline ms-1">Bezárás</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3.2 ng-bootstrap `NgbModal`: törlés megerősítése

A modal tartalma egy rendes Angular komponens. Az **`NgbActiveModal`**-t injektálva tudja
bezárni magát: a `close()` „igen”, a `dismiss()` „mégse” eredménnyel zár.

**Hova:** `neptun-pp-ng/src/app/_component/confirm-dialog/confirm-dialog.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * Megerősítő modal az ng-bootstrap NgbModal szolgáltatásával.
 * Nem kell sem rejtett gomb, sem Bootstrap JS: a megnyitás egy függvényhívás,
 * az eredményt pedig egy Promise adja vissza:
 *
 *   const modalRef = this.modal.open(ConfirmDialog);
 *   modalRef.componentInstance.message = 'Biztosan?';
 *   modalRef.result.then(() => ...igen..., () => ...mégse...);
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  /** A megnyitott modal referenciája: close() → then ág, dismiss() → catch ág */
  protected readonly activeModal = inject(NgbActiveModal);

  @Input() message = '';
}
```

A sablon a Bootstrap modal szokásos három része (header, body, footer), de `div.modal` és
`data-bs-*` nélkül, mert a keretet az ng-bootstrap adja.

**Hova:** `neptun-pp-ng/src/app/_component/confirm-dialog/confirm-dialog.html` – **új fájl**

```html
<div class="modal-header text-bg-danger">
  <h1 class="modal-title fs-5">Törlés</h1>
  <button type="button" class="btn-close btn-close-white" aria-label="Bezárás"
          (click)="activeModal.dismiss()"></button>
</div>
<div class="modal-body">
  {{ message }}
</div>
<div class="modal-footer">
  <!-- az ikon mindig látszik, a felirat csak md mérettől -->
  <button type="button" class="btn btn-outline-secondary" title="Mégse"
          (click)="activeModal.dismiss()">
    <i class="bi bi-x-lg"></i>
    <span class="d-none d-md-inline ms-1">Mégse</span>
  </button>
  <button type="button" class="btn btn-danger" title="Törlés"
          (click)="activeModal.close()">
    <i class="bi bi-trash"></i>
    <span class="d-none d-md-inline ms-1">Törlés</span>
  </button>
</div>
```

A megnyitás egy függvényhívás (`this.modal.open(ConfirmDialog)`), az eredményt pedig egy
**Promise** adja vissza: a `then` első ága a `close()`, a második a `dismiss()` (Mégse, X, Esc).
A sikeres törlés utáni `alert` kikerült, a hibákat a 4. lépésig még `alert`-tel jelezzük.

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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListCard } from '../list-card/list-card';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, ListCard, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modal = inject(NgbModal);

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

  /** Törlés előtt rákérdezünk (ng-bootstrap NgbModal). */
  protected confirmDelete(student: Student): void {
    const modalRef = this.modal.open(ConfirmDialog);
    modalRef.componentInstance.message =
      `Biztosan törlöd ${student.name} (${student.neptun}) hallgatót?`;
    modalRef.result.then(
      () => this.deleteOne(student), // "Törlés" → close()
      () => {}, // "Mégse" / X / Esc → dismiss()
    );
  }

  private deleteOne(student: Student): void {
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

A sablonban csak annyi változik, hogy a Törlés gomb a `confirmDelete`-et hívja.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<app-list-card title="Hallgatók"
               entity="hallgató"
               [items]="students | sort: orderBy : desc"
               [columns]="6">

  <!-- ng-content: egyszeri tartalom a kártya fejlécébe -->
  <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
  <a actions class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
    <i class="bi bi-plus-lg"></i>
    <span class="d-none d-md-inline ms-1">Létrehozás</span>
  </a>

  <ng-template #header>
    <!-- v1: egyirányú kötés, a szülő order függvényét kapja -->
    <th sortable-v1 value="neptun" [orderBy]="orderBy" [desc]="desc" [order]="order">Neptun-kód</th>
    <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
    <!-- v2: kétirányú kötés -->
    <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
    <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">Létrehozva</th>
    <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">Módosítva</th>
    <th>Műveletek</th>
  </ng-template>

  <ng-template #row let-student>
    <td><code class="badge text-bg-dark">{{ student.neptun }}</code></td>
    <td>{{ student.name }}</td>
    <td>{{ student.program | program }}</td>
    <td>{{ student.created | date: datetimeFormat }}</td>
    <td>{{ student.updated | date: datetimeFormat }}</td>
    <td>
      <button class="btn btn-sm btn-outline-danger m-1" title="Törlés"
              (click)="confirmDelete(student)">
        <i class="bi bi-trash"></i>
        <span class="d-none d-md-inline ms-1">Törlés</span>
      </button>
      <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
         [routerLink]="student.neptun">
        <i class="bi bi-pencil"></i>
        <span class="d-none d-md-inline ms-1">Módosítás</span>
      </a>
    </td>
  </ng-template>
</app-list-card>
```

| | Rejtett gomb | `NgbModal` |
|---|---|---|
| Megnyitás | `data-bs-*` + `.click()` | `modal.open(Komponens)` |
| Eredmény | nincs | Promise (`close` / `dismiss`) |
| Bootstrap JS kell? | igen | nem |

---

---

## 4. Hibák megjelenítése: `ErrorAlert` (15')

```bash
ng generate component _component/error-alert --skip-tests
```

A backend a hibákat egységes JSON-ben (`ProblemDetail`) adja vissza, a megfelelő HTTP
státuszkóddal:

| Helyzet | HTTP | Példa válasz |
|---|---|---|
| nem létező hallgató | 404 | `{ "status": 404, "title": "Not Found", "detail": "Not found" }` |
| tárgyfelvétellel rendelkező hallgató törlése | 409 | `{ "status": 409, "title": "Conflict", ... }` |
| validációs hiba (`@NotBlank`, `@Size(3–100)`, `@NotNull`) | 400 | `{ "status": 400, ..., "errors": { "name": "nem lehet üres" } }` |

Eddig ezeket `alert(JSON.stringify(...))`-gyel írtuk ki; most a kártyán belül, olvashatóan.

### 4.1 Az ErrorAlert komponens

Egy újrahasznosítható komponens, ami egy `HttpErrorResponse`-t jelenít meg. A fő üzenet a
**HTTP státuszkód** alapján jön egy táblázatból (a `0` azt jelenti, hogy válasz sem jött, pl.
nem fut a backend). 400-as validációs hibánál a backend `errors` objektumát mezőnként
kilistázza; a `labels` inputtal a mezők nevét (`name`) emberi címkére (`Név`) cserélhetjük.

**Hova:** `neptun-pp-ng/src/app/_component/error-alert/error-alert.ts` – **új fájl**

```ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { KeyValuePipe } from '@angular/common';

/**
 * Újrahasznosítható hibaüzenet egy HttpErrorResponse-hoz.
 *  - a fő üzenet a HTTP státuszkód alapján jön (0, 400, 404, 409, minden más: 500);
 *  - 400-as validációs hibánál a backend "errors" objektumát mezőnként kilistázza.
 *
 *   <app-error-alert [error]="error" [labels]="{ name: 'Név' }"></app-error-alert>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [KeyValuePipe],
  selector: 'app-error-alert',
  styleUrl: './error-alert.scss',
  templateUrl: './error-alert.html',
})
export class ErrorAlert {
  @Input() error?: HttpErrorResponse;
  /** A mezőnevek címkéi, pl. { name: 'Név' }. Ha egy mező nincs benne, a neve látszik. */
  @Input() labels: Record<string, string> = {};

  private static readonly MESSAGES: Record<number, string> = {
    0: 'A szerver nem érhető el. Fut a backend?',
    400: 'Hibás adatok, kérlek javítsd ki őket!',
    404: 'Nincs ilyen elem.',
    409: 'A művelet nem hajtható végre, mert más adat hivatkozik erre az elemre.',
    500: 'Váratlan hiba történt a szerveren.',
  };

  protected get message(): string {
    return ErrorAlert.MESSAGES[this.error?.status ?? 500] ?? ErrorAlert.MESSAGES[500];
  }

  /** A backend GlobalExceptionHandler-e által küldött mezőhibák: { name: "...", program: "..." } */
  protected get fieldErrors(): Record<string, string> | undefined {
    return this.error?.error?.errors;
  }
}
```

A `keyvalue` pipe egy objektumot kulcs–érték párok tömbjévé alakít, így `@for`-ral bejárható.

**Hova:** `neptun-pp-ng/src/app/_component/error-alert/error-alert.html` – **új fájl**

```html
@if (error) {
  <div class="alert alert-danger m-2">
    <i class="bi bi-exclamation-triangle-fill me-1"></i>
    {{ message }}

    @if (fieldErrors) {
      <ul class="mb-0">
        @for (fieldError of fieldErrors | keyvalue; track fieldError.key) {
          <li>
            <b>{{ labels[fieldError.key] ?? fieldError.key }}:</b>
            {{ fieldError.value }}
          </li>
        }
      </ul>
    }
  </div>
}
```

> A validációs üzenetek (pl. „nem lehet üres”) a backendtől jönnek, a kérés `Accept-Language`
> fejléce szerinti nyelven. Ezt a böngésző magától elküldi a saját nyelvi beállításával, ezért
> magyar böngészőben magyarul látjuk őket. (A `v11-i18n` változatban egy interceptor állítja be.)

### 4.2 ListCard

Kap egy `error` inputot, és a kártya tetején megjeleníti az `ErrorAlert`-et. Így a listák
betöltési hibái mindenhol ugyanígy látszanak.

**Hova:** `neptun-pp-ng/src/app/_component/list-card/list-card.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorAlert } from '../error-alert/error-alert';
import { EmptyRow } from '../empty-row/empty-row';

/**
 * Újrahasznosítható listázó kártya: a keret (kártya, cím, hibaüzenet, táblázat,
 * "nincs adat" sor) itt van EGYSZER megírva, a változó részeket a használó adja
 * ng-template-ként:
 *
 *   <app-list-card title="Tárgyak" entity="tárgy" [items]="subjects" [error]="error" [columns]="3">
 *     <ng-template #header> <th>...</th> </ng-template>
 *     <ng-template #row let-subject> <td>{{ subject.name }}</td> </ng-template>
 *   </app-list-card>
 *
 * ng-content vs. ng-template: az ng-content egyszer vetíti be a tartalmat
 * (ezt használjuk a fejléc gombjaihoz: [actions]), a sablont viszont soronként,
 * paraméterezve (let-subject) újra és újra ki tudjuk rajzolni.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgTemplateOutlet, ErrorAlert, EmptyRow],
  selector: 'app-list-card',
  styleUrl: './list-card.scss',
  templateUrl: './list-card.html',
})
export class ListCard<T> {
  @Input({ required: true }) title!: string;
  @Input() items: T[] = [];
  @Input() error?: HttpErrorResponse;
  /** A "nincs adat" sor (EmptyRow) ennyi oszlopot fog át. */
  @Input() columns = 1;
  /** Az entitás neve a "Nincs megjeleníthető ..." sorhoz, pl. 'hallgató' */
  @Input({ required: true }) entity!: string;

  @ContentChild('header') protected header?: TemplateRef<unknown>;
  @ContentChild('row') protected row?: TemplateRef<unknown>;
}
```

**Hova:** `neptun-pp-ng/src/app/_component/list-card/list-card.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">{{ title }}</span>
      <!-- egyszeri tartalom (pl. Létrehozás gomb): ng-content -->
      <ng-content select="[actions]"></ng-content>
    </div>

    <app-error-alert [error]="error"></app-error-alert>

    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <ng-container *ngTemplateOutlet="header ?? null"></ng-container>
        </tr>
        </thead>
        <tbody>
          @for (item of items; track $index) {
            <tr>
              <!-- soronként ismétlődő tartalom: ng-template + kontextus -->
              <ng-container *ngTemplateOutlet="row ?? null; context: { $implicit: item }"></ng-container>
            </tr>
          } @empty {
            <tr empty [colSpan]="columns">{{ entity }}</tr>
          }
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 4.3 Hallgatólista

A `subscribe` hibaága eltárolja a hibát (`this.error = error`), és a ListCard megjeleníti.
Az `alert` eltűnt. Próba: töröld azt a hallgatót, aki a Tárgyfelvételek listában szerepel (409),
vagy állítsd le a backendet, és frissítsd az oldalt (0).

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
import { HttpErrorResponse } from '@angular/common/http';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListCard } from '../list-card/list-card';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, ListCard, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];
  protected error?: HttpErrorResponse;

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modal = inject(NgbModal);

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.students = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
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

  /** Törlés előtt rákérdezünk (ng-bootstrap NgbModal). */
  protected confirmDelete(student: Student): void {
    const modalRef = this.modal.open(ConfirmDialog);
    modalRef.componentInstance.message =
      `Biztosan törlöd ${student.name} (${student.neptun}) hallgatót?`;
    modalRef.result.then(
      () => this.deleteOne(student), // "Törlés" → close()
      () => {}, // "Mégse" / X / Esc → dismiss()
    );
  }

  private deleteOne(student: Student): void {
    this.error = undefined;
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      // pl. 409: a hallgatónak van tárgyfelvétele
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

A sablonban csak az `[error]="error"` kötés az új.

**Hova:** `neptun-pp-ng/src/app/_component/student-list/student-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<app-list-card title="Hallgatók"
               entity="hallgató"
               [items]="students | sort: orderBy : desc"
               [error]="error"
               [columns]="6">

  <!-- ng-content: egyszeri tartalom a kártya fejlécébe -->
  <!-- gombok: az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
  <a actions class="btn btn-sm btn-dark m-1" [routerLink]="'create'" title="Létrehozás">
    <i class="bi bi-plus-lg"></i>
    <span class="d-none d-md-inline ms-1">Létrehozás</span>
  </a>

  <ng-template #header>
    <!-- v1: egyirányú kötés, a szülő order függvényét kapja -->
    <th sortable-v1 value="neptun" [orderBy]="orderBy" [desc]="desc" [order]="order">Neptun-kód</th>
    <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
    <!-- v2: kétirányú kötés -->
    <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
    <th sortable-v2 value="created" [(orderBy)]="orderBy" [(desc)]="desc">Létrehozva</th>
    <th sortable-v2 value="updated" [(orderBy)]="orderBy" [(desc)]="desc">Módosítva</th>
    <th>Műveletek</th>
  </ng-template>

  <ng-template #row let-student>
    <td><code class="badge text-bg-dark">{{ student.neptun }}</code></td>
    <td>{{ student.name }}</td>
    <td>{{ student.program | program }}</td>
    <td>{{ student.created | date: datetimeFormat }}</td>
    <td>{{ student.updated | date: datetimeFormat }}</td>
    <td>
      <button class="btn btn-sm btn-outline-danger m-1" title="Törlés"
              (click)="confirmDelete(student)">
        <i class="bi bi-trash"></i>
        <span class="d-none d-md-inline ms-1">Törlés</span>
      </button>
      <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
         [routerLink]="student.neptun">
        <i class="bi bi-pencil"></i>
        <span class="d-none d-md-inline ms-1">Módosítás</span>
      </a>
    </td>
  </ng-template>
</app-list-card>
```

### 4.4 Szerkesztő

Itt jön elő a validáció: a hibás mentés 400-at ad, mezőnkénti hibákkal. A `labels` miatt a
mezőnevek is olvashatók („Név”, „Szak”). Próba: töröld ki a nevet, és ments; vagy írj rossz
Neptun-kódot az URL-be (404). A kártya fejléce kikerül az `@if (student)` blokkból, hogy 404
esetén is legyen hol megjelennie a hibának.

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, of, switchMap, tap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { ErrorAlert } from '../error-alert/error-alert';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ProgramPipe, ErrorAlert],
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

  protected student!: Student;
  protected error?: HttpErrorResponse;

  /** A backend mezőneveinek címkéi az ErrorAlert-hez. */
  protected readonly labels = { name: 'Név', program: 'Szak' };

  /** Tavalyi megoldás: rejtett gombokkal nyitjuk/zárjuk a Bootstrap modalt. */
  @ViewChild('openModal') private openModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('closeModal') private closeModal!: ElementRef<HTMLButtonElement>;

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
        // pl. 404: nincs ilyen Neptun-kód
        error: (error: HttpErrorResponse) => this.showError(error),
      });
  }

  protected get isNew(): boolean {
    return !this.student.neptun;
  }

  protected save(): void {
    this.error = undefined;
    if (this.isNew) {
      this.client.createOne(this.student).subscribe({
        // új hallgató → átnavigálunk a szerkesztő oldalára
        next: (student) => this.router.navigate(['/student', student.neptun], { replaceUrl: true }),
        error: (error: HttpErrorResponse) => this.showError(error),
      });
      return;
    }

    this.client
      .updateOne(this.student)
      .pipe(
        tap((student) => (this.student = student)),
        tap(() => this.openModal.nativeElement.click()), // rejtett gomb → modal megnyílik
        delay(3000),
        tap(() => this.closeModal.nativeElement.click()), // 3 mp múlva bezárjuk
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: HttpErrorResponse) => this.showError(error), // pl. 400 validációs hiba
      });
  }

  private showError(error: HttpErrorResponse): void {
    this.error = error;
    this.cdr.markForCheck();
  }

  protected readonly programs = programs;
}
```

**Hova:** `neptun-pp-ng/src/app/_component/student-edit/student-edit.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary">
      @if (student) {
        {{ isNew ? 'Create Student' : `Edit ${student.name}` }}
      } @else {
        Student
      }
    </div>

    <!-- 400-nál a mezőnkénti hibák is megjelennek, a labels szerinti címkékkel -->
    <app-error-alert [error]="error" [labels]="labels"></app-error-alert>

    <!-- a hallgató aszinkron töltődik be: amíg nincs meg, ne próbáljuk kirajzolni -->
    @if (student) {
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
          <label for="program">Program</label>
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

<!-- Tavalyi megoldás: rejtett gomb, ami a data-bs-* attribútumokkal nyitja a modalt.
     A kódból a gomb .click()-jét hívjuk (lásd student-edit.ts). -->
<button #openModal type="button" class="d-none"
        data-bs-toggle="modal" data-bs-target="#savedModal"></button>

<div class="modal fade" id="savedModal" tabindex="-1" aria-labelledby="savedModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="alert alert-success m-0">
        <h1 class="modal-title fs-5" id="savedModalLabel">Sikeres mentés!</h1>
        <p>A módosításokat elmentettük, tovább szerkesztheted a hallgatót.</p>
        <button #closeModal type="button" class="btn btn-success btn-sm w-100" data-bs-dismiss="modal"
                title="Bezárás">
          <i class="bi bi-x-lg"></i>
          <span class="d-none d-md-inline ms-1">Bezárás</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

### 4.5 Tárgy- és tárgyfelvétel-lista

Ugyanaz a minta: `error` mező, hibaág a `subscribe`-ban, `[error]="error"` a ListCardnak.

**Hova:** `neptun-pp-ng/src/app/_component/subject-list/subject-list.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from '../../_model/subject';
import { SubjectClient } from '../../_service/subject-client';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ProgramPipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-subject-list',
  styleUrl: './subject-list.scss',
  templateUrl: './subject-list.html',
})
export class SubjectList implements OnInit {
  private readonly client = inject(SubjectClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected subjects: Subject[] = [];
  protected error?: HttpErrorResponse;
  protected sort?: Sort<Subject>;

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.subjects = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }
}
```

**Hova:** `neptun-pp-ng/src/app/_component/subject-list/subject-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<!-- v3: a [sortable-table] tárolja a rendezést, a th[sortable-v3] fejlécek DI-vel érik el -->
<app-list-card sortable-table [(sort)]="sort"
               title="Tárgyak"
               entity="tárgy"
               [items]="subjects | sort: sort?.orderBy : sort?.desc"
               [error]="error"
               [columns]="5">

  <ng-template #header>
    <th sortable-v3="code">Kód</th>
    <th sortable-v3="name">Név</th>
    <th sortable-v3="credits">Kredit</th>
    <th sortable-v3="limit">Létszámkorlát</th>
    <th sortable-v3="program">Szak</th>
  </ng-template>

  <ng-template #row let-subject>
    <td><code class="badge text-bg-dark">{{ subject.code }}</code></td>
    <td>{{ subject.name }}</td>
    <td>{{ subject.credits }}</td>
    <td>{{ subject.limit }}</td>
    <td>{{ subject.program | program }}</td>
  </ng-template>
</app-list-card>
```

**Hova:** `neptun-pp-ng/src/app/_component/enrollment-list/enrollment-list.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Enrollment } from '../../_model/enrollment';
import { EnrollmentClient } from '../../_service/enrollment-client';
import { SortPipe } from '../../_pipe/sort-pipe';
import { datetimeFormat } from '../../app.constants';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-enrollment-list',
  styleUrl: './enrollment-list.scss',
  templateUrl: './enrollment-list.html',
})
export class EnrollmentList implements OnInit {
  private readonly client = inject(EnrollmentClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected enrollments: Enrollment[] = [];
  protected error?: HttpErrorResponse;
  protected sort?: Sort<Enrollment>;

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.enrollments = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
```

**Hova:** `neptun-pp-ng/src/app/_component/enrollment-list/enrollment-list.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<!-- Ugyanaz a ListCard és ugyanaz a generikus (v3) rendezés, csak más típussal: Enrollment -->
<app-list-card sortable-table [(sort)]="sort"
               title="Tárgyfelvételek"
               entity="tárgyfelvétel"
               [items]="enrollments | sort: sort?.orderBy : sort?.desc"
               [error]="error"
               [columns]="4">

  <ng-template #header>
    <!-- a student és subject objektum, ezek szerint nem rendezünk -->
    <th>Hallgató</th>
    <th>Tárgy</th>
    <th sortable-v3="grade">Jegy</th>
    <th sortable-v3="created">Felvéve</th>
  </ng-template>

  <ng-template #row let-enrollment>
    <td>
      <code class="badge text-bg-dark">{{ enrollment.student.neptun }}</code>
      {{ enrollment.student.name }}
    </td>
    <td>
      <code class="badge text-bg-secondary">{{ enrollment.subject.code }}</code>
      {{ enrollment.subject.name }}
    </td>
    <td>{{ enrollment.grade }}</td>
    <td>{{ enrollment.created | date: datetimeFormat }}</td>
  </ng-template>
</app-list-card>
```

---

## Függelék

### Tesztek

```bash
cd neptun-pp-ng && npm test
```

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-ux`) van. A többi v11 változat ugyanebből a v10-es állapotból indul,
egymástól függetlenül.
