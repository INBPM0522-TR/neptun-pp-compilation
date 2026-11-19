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
