import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Enrollment } from '../../_model/enrollment';
import { EnrollmentClient } from '../../_service/enrollment-client';
import { SortPipe } from '../../_pipe/sort-pipe';
import { datetimeFormat } from '../../app.constants';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-enrollment-list',
  styleUrl: './enrollment-list.scss',
  templateUrl: './enrollment-list.html',
})
export class EnrollmentList implements OnInit {
  private readonly client = inject(EnrollmentClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected enrollments: Enrollment[] = [];
  protected error?: HttpErrorResponse;
  protected sort?: Sort<Enrollment>;

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.enrollments = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }

  protected readonly datetimeFormat = datetimeFormat;
}
