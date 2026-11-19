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
