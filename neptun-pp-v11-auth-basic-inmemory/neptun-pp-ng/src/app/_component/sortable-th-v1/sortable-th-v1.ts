import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v1: EGYIRÁNYÚ kötés (a tavalyi megoldás).
 * Minden adat inputon jön lefelé, a rendezést végző függvényt is a szülő adja át:
 *
 *   <th sortable-v1 value="name" [orderBy]="orderBy" [desc]="desc" [order]="order">Név</th>
 *
 * A szülőben az order arrow function legyen, hogy a `this` ott is a szülőt jelentse!
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'th[sortable-v1]',
  styleUrl: './sortable-th-v1.scss',
  templateUrl: './sortable-th-v1.html',
})
export class SortableThV1 {
  @Input({ required: true }) value!: Student.Key;
  @Input() orderBy?: Student.Key;
  @Input() desc = false;
  @Input({ required: true }) order!: (value: Student.Key) => void;
}
