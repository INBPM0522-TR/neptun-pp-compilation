import { Component, input, model } from '@angular/core';
import { Student } from '../../_model/student';

/**
 * v2: KÉTIRÁNYÚ kötés ("banana in a box") model()-lel.
 * A model() = @Input x + @Output xChange egyben; a szülő egy signalt köthet bele:
 *
 *   <th sortable-v2 value="program" [(orderBy)]="orderBy" [(desc)]="desc">Szak</th>
 */
@Component({
  selector: 'th[sortable-v2]',
  styleUrl: './sortable-th-v2.scss',
  templateUrl: './sortable-th-v2.html',
})
export class SortableThV2 {
  readonly value = input.required<Student.Key>();
  readonly orderBy = model<Student.Key>();
  readonly desc = model(false);

  protected click(): void {
    if (this.orderBy() === this.value()) {
      this.desc.update((desc) => !desc);
    } else {
      this.orderBy.set(this.value());
      this.desc.set(false);
    }
  }
}
