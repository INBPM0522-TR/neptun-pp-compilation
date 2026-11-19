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
