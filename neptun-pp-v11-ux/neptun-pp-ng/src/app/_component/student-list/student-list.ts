import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { datetimeFormat } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListCard } from '../list-card/list-card';
import { SortableThV1 } from '../sortable-th-v1/sortable-th-v1';
import { SortableThV2 } from '../sortable-th-v2/sortable-th-v2';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ProgramPipe, SortPipe, RouterLink, ListCard, SortableThV1, SortableThV2],
  selector: 'app-student-list',
  styleUrl: './student-list.scss',
  templateUrl: './student-list.html',
})
export class StudentList implements OnInit {
  protected students: Student[] = [];
  protected error?: HttpErrorResponse;

  protected orderBy?: Student.Key;
  protected desc = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modal = inject(NgbModal);

  constructor(private client: StudentClient) {}

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.students = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
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

  /** Törlés előtt rákérdezünk (ng-bootstrap NgbModal). */
  protected confirmDelete(student: Student): void {
    const modalRef = this.modal.open(ConfirmDialog);
    modalRef.componentInstance.message =
      `Biztosan törlöd ${student.name} (${student.neptun}) hallgatót?`;
    modalRef.result.then(
      () => this.deleteOne(student), // "Törlés" → close()
      () => {}, // "Mégse" / X / Esc → dismiss()
    );
  }

  private deleteOne(student: Student): void {
    this.error = undefined;
    this.client.deleteOne(student.neptun).subscribe({
      next: () => {
        this.students = this.students.filter((s) => s.neptun !== student.neptun);
        this.cdr.markForCheck();
      },
      // pl. 409: a hallgatónak van tárgyfelvétele
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
