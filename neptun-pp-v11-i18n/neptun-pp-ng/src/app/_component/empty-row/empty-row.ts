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
