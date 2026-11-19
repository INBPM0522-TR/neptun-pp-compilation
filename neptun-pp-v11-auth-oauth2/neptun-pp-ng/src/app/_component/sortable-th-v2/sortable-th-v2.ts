import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v2: KÉTIRÁNYÚ kötés ("banana in a box").
 * Ha van `x` @Input és `xChange` @Output, a szülő írhatja: [(x)]="valtozo"
 * ami ennek a rövidítése: [x]="valtozo" (xChange)="valtozo = $event"
 *
 *   <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
 *
 * A rendezés logikája itt van, a szülőnek nem kell order() függvényt írnia.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'th[sortable-v2]',
  styleUrl: './sortable-th-v2.scss',
  templateUrl: './sortable-th-v2.html',
})
export class SortableThV2 {
  @Input({ required: true }) value!: Student.Key;

  @Input() orderBy?: Student.Key;
  @Output() orderByChange = new EventEmitter<Student.Key>();

  @Input() desc = false;
  @Output() descChange = new EventEmitter<boolean>();

  protected click(): void {
    if (this.orderBy === this.value) {
      this.descChange.emit(!this.desc);
    } else {
      this.orderByChange.emit(this.value);
      this.descChange.emit(false);
    }
  }
}
