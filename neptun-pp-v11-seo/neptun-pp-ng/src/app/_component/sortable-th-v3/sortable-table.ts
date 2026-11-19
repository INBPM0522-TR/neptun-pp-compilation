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
