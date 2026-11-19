import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { sortBy } from '../../_pipe/sort-pipe';
import { EmptyRow } from '../empty-row/empty-row';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  imports: [DatePipe, ProgramPipe, RouterLink, EmptyRow, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList {
  private readonly client = inject(StudentClient);

  /** Observable → signal, a betöltés állapotával együtt (isLoading, error, value) */
  protected readonly students = rxResource({
    stream: () => this.client.findAll(),
    defaultValue: [],
  });

  protected readonly orderBy = signal<Student.Key | undefined>(undefined);
  protected readonly desc = signal(false);

  /** Csak akkor számolódik újra, ha a lista vagy a rendezés változik */
  protected readonly sortedStudents = computed(() =>
    sortBy(this.students.hasValue() ? this.students.value() : [], this.orderBy(), this.desc()),
  );

  /** v1 (egyirányú) fejlécnek átadott függvény. Arrow function, hogy a `this` megmaradjon! */
  protected readonly order = (value: Student.Key): void => {
    if (this.orderBy() === value) {
      this.desc.update((desc) => !desc);
    } else {
      this.orderBy.set(value);
      this.desc.set(false);
    }
  };

  protected deleteOne(student: Student): void {
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        alert('Success');
        // a resource értéke írható: nem kell újratölteni, és markForCheck sem kell
        this.students.update((students) => students.filter((s) => s.neptun !== student.neptun));
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
