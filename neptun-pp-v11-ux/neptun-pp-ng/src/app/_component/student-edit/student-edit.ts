import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { StudentClient } from '../../_service/student-client';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, of, switchMap, tap } from 'rxjs';
import { Student } from '../../_model/student';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';
import { ErrorAlert } from '../error-alert/error-alert';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ProgramPipe, ErrorAlert],
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
  protected error?: HttpErrorResponse;

  /** A backend mezőneveinek címkéi az ErrorAlert-hez. */
  protected readonly labels = { name: 'Név', program: 'Szak' };

  /** Tavalyi megoldás: rejtett gombokkal nyitjuk/zárjuk a Bootstrap modalt. */
  @ViewChild('openModal') private openModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('closeModal') private closeModal!: ElementRef<HTMLButtonElement>;

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
        // pl. 404: nincs ilyen Neptun-kód
        error: (error: HttpErrorResponse) => this.showError(error),
      });
  }

  protected get isNew(): boolean {
    return !this.student.neptun;
  }

  protected save(): void {
    this.error = undefined;
    if (this.isNew) {
      this.client.createOne(this.student).subscribe({
        // új hallgató → átnavigálunk a szerkesztő oldalára
        next: (student) => this.router.navigate(['/student', student.neptun], { replaceUrl: true }),
        error: (error: HttpErrorResponse) => this.showError(error),
      });
      return;
    }

    this.client
      .updateOne(this.student)
      .pipe(
        tap((student) => (this.student = student)),
        tap(() => this.openModal.nativeElement.click()), // rejtett gomb → modal megnyílik
        delay(3000),
        tap(() => this.closeModal.nativeElement.click()), // 3 mp múlva bezárjuk
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: HttpErrorResponse) => this.showError(error), // pl. 400 validációs hiba
      });
  }

  private showError(error: HttpErrorResponse): void {
    this.error = error;
    this.cdr.markForCheck();
  }

  protected readonly programs = programs;
}
