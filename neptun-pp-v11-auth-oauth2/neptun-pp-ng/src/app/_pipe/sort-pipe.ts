import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generikus rendezés bármilyen T típusú tömbre:
 *   @for (s of students | sort: orderBy : desc; track s.neptun) { ... }
 *
 * Új tömböt ad vissza, az eredetit nem rendezi át.
 */
@Pipe({
  name: 'sort',
})
export class SortPipe implements PipeTransform {
  transform<T>(items: T[] | undefined, orderBy?: keyof T, desc = false): T[] {
    if (!items || !orderBy) {
      return items ?? [];
    }
    return [...items].sort((a, b) => {
      if (a[orderBy] == b[orderBy]) {
        return 0;
      }
      return (a[orderBy] < b[orderBy] ? -1 : 1) * (desc ? -1 : 1);
    });
  }
}
