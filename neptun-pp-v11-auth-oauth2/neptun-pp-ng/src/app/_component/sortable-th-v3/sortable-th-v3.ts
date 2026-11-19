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
