import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { ActivatedRoute, Router, Routes } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [JsonPipe, FormsModule, ProgramPipe],
  selector: 'app-student-edit',
  styleUrl: './student-edit.scss',
  templateUrl: './student-edit.html',
})
export class StudentEdit implements OnInit {
  private readonly client = inject(StudentClient);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected student!: Student;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const neptun = params.get('neptun');
          return neptun ? this.client.findOne(neptun) : of(Student.empty());
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (student) => {
          this.student = student;
          this.cdr.markForCheck();
        },
      });
  }

  protected get isNew(): boolean {
    return !this.student.neptun;
  }

  protected save(): void {
    const request = this.isNew
      ? this.client.createOne(this.student)
      : this.client.updateOne(this.student);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (student: Student) => {
        alert('Success');
        if (this.isNew) {
          this.router.navigate(['/student', student.neptun], { replaceUrl: true });
        }
        this.student = student;
      },
    });
  }

  protected readonly programs = programs;
}
