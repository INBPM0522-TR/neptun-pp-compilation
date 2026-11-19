import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  RESPONSE_INIT,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { Seo } from '../../_service/seo';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ProgramPipe],
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
  private readonly seo = inject(Seo);
  /** A szerveren a készülő HTTP-válasz beállításai (státuszkód), a böngészőben null */
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  protected student!: Student;
  protected notFound = false;

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
          this.updateSeo();
          this.cdr.markForCheck();
        },
        error: () => {
          this.notFound = true;
          // valódi 404 a keresőnek (különben "soft 404": 200 OK egy hibaoldallal)
          if (this.responseInit) {
            this.responseInit.status = 404;
          }
          this.seo.setTitle('Nincs ilyen hallgató');
          this.seo.update({ description: 'Nincs ilyen hallgató.', path: '/student', index: false });
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
        this.updateSeo();
      },
    });
  }

  private updateSeo(): void {
    if (this.isNew) {
      this.seo.update({ description: 'Új hallgató felvétele.', path: '/student/create', index: false });
      return;
    }
    this.seo.setTitle(this.student.name);
    this.seo.update({
      description: `${this.student.name} (${this.student.neptun}), ${programs.get(this.student.program)} hallgató adatlapja.`,
      path: `/student/${this.student.neptun}`,
    });
  }

  protected readonly programs = programs;
}
