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
