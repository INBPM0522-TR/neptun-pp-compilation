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
