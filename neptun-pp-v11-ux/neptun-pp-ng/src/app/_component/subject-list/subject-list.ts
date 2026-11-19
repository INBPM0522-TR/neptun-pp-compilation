import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from '../../_model/subject';
import { SubjectClient } from '../../_service/subject-client';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { SortPipe } from '../../_pipe/sort-pipe';
import { ListCard } from '../list-card/list-card';
import { Sort, SortableTable } from '../sortable-th-v3/sortable-table';
import { SortableThV3 } from '../sortable-th-v3/sortable-th-v3';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ProgramPipe, SortPipe, ListCard, SortableTable, SortableThV3],
  selector: 'app-subject-list',
  styleUrl: './subject-list.scss',
  templateUrl: './subject-list.html',
})
export class SubjectList implements OnInit {
  private readonly client = inject(SubjectClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected subjects: Subject[] = [];
  protected error?: HttpErrorResponse;
  protected sort?: Sort<Subject>;

  ngOnInit(): void {
    this.client.findAll().subscribe({
      next: (data) => {
        this.subjects = data;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.cdr.markForCheck();
      },
    });
  }
}
