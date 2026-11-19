import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { Seo } from '../../_service/seo';
import { DatePipe } from '@angular/common';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { RouterLink } from '@angular/router';
import { EmptyRow } from '../empty-row/empty-row';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, EmptyRow, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly seo = inject(Seo);

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.seo.update({ description: 'A Neptun++ hallgatóinak listája.', path: '/student' });

    this.client.findAll().subscribe((data) => {
      this.students = data;
      // a szerveren ez még a HTML elküldése előtt lefut (az SSR megvárja a HTTP-kérést)
      this.seo.update({
        description: `A Neptun++ ${data.length} hallgatójának listája szakkal és Neptun-kóddal.`,
        path: '/student',
      });
      this.cdr.markForCheck();
    });
  }

  /** v1 (egyirányú) fejlécnek átadott függvény. Arrow function, hogy a `this` megmaradjon! */
  protected readonly order = (value: Student.Key): void => {
    if (this.orderBy === value) {
      this.desc = !this.desc;
    } else {
      this.orderBy = value;
      this.desc = false;
    }
  };

  protected deleteOne(student: Student): void {
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        alert('Success');
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      error: (err) => alert(JSON.stringify(err.error)),
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
