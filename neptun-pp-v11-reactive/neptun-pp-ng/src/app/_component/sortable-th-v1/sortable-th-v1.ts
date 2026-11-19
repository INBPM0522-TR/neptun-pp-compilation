import { Component, input } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v1: EGYIRÁNYÚ kötés (a tavalyi megoldás), signalos inputokkal.
 * Minden adat inputon jön lefelé, a rendezést végző függvényt is a szülő adja át:
 *
 *   <th sortable-v1 value="name" [orderBy]="orderBy()" [desc]="desc()" [order]="order">Név</th>
 */
@Component({
  selector: 'th[sortable-v1]',
  styleUrl: './sortable-th-v1.scss',
  templateUrl: './sortable-th-v1.html',
})
export class SortableThV1 {
  readonly value = input.required<Student.Key>();
  readonly orderBy = input<Student.Key>();
  readonly desc = input(false);
  readonly order = input.required<(value: Student.Key) => void>();
}
