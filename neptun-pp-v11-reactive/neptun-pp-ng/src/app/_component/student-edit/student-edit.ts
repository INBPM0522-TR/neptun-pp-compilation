import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom, of } from 'rxjs';
import { Student } from '../../_model/student';
import { StudentClient } from '../../_service/student-client';
import { programs } from '../../app.constants';
import { ProgramPipe } from '../../_pipe/program-pipe';

@Component({
  imports: [FormField, ProgramPipe],
  selector: 'app-student-edit',
  styleUrl: './student-edit.scss',
  templateUrl: './student-edit.html',
})
export class StudentEdit {
  private readonly client = inject(StudentClient);
  private readonly router = inject(Router);

  /** A route :neptun paramétere (withComponentInputBinding); új hallgatónál undefined */
  readonly neptun = input<string>();

  /** Betöltés: ha a neptun változik, magától újra lefut */
  protected readonly loaded = rxResource({
    params: () => ({ neptun: this.neptun() }),
    stream: ({ params }) =>
      params.neptun ? this.client.findOne(params.neptun) : of(Student.empty()),
  });

  /** A szerkesztett hallgató: a betöltött értékből indul, de írható (ebbe ír az űrlap) */
  protected readonly student = linkedSignal(() =>
    this.loaded.hasValue() ? this.loaded.value() : Student.empty(),
  );

  /** Signal Forms: ugyanazok a szabályok, mint a backenden (@NotBlank, @Size, @NotNull) */
  protected readonly studentForm = form(this.student, (path) => {
    required(path.name, { message: 'A név megadása kötelező.' });
    minLength(path.name, 3, { message: 'A név legalább 3 karakter.' });
    maxLength(path.name, 100, { message: 'A név legfeljebb 100 karakter.' });
    required(path.program, { message: 'Válassz szakot!' });
  });

  protected readonly isNew = computed(() => !this.student().neptun);

  protected save(): void {
    // csak érvényes űrlapnál fut; a visszaadott hibák a megfelelő mező alá kerülnek
    submit(this.studentForm, async () => {
      const isNew = this.isNew();
      try {
        const saved = await firstValueFrom(
          isNew ? this.client.createOne(this.student()) : this.client.updateOne(this.student()),
        );
        alert('Success');
        if (isNew) {
          await this.router.navigate(['/student', saved.neptun], { replaceUrl: true });
        } else {
          this.student.set(saved);
        }
        return undefined;
      } catch (error) {
        // 400: a backend mezőnkénti hibái, pl. { "name": "nem lehet üres" }
        const errors: Record<string, string> = (error as HttpErrorResponse).error?.errors ?? {};
        return Object.entries(errors).map(([field, message]) => ({
          kind: 'server',
          message,
          fieldTree: this.studentForm[field as 'name' | 'program'],
        }));
      }
    });
  }

  protected readonly programs = programs;
}
