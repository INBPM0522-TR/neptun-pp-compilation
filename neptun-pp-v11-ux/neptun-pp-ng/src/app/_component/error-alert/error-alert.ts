import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { KeyValuePipe } from '@angular/common';

/**
 * Újrahasznosítható hibaüzenet egy HttpErrorResponse-hoz.
 *  - a fő üzenet a HTTP státuszkód alapján jön (0, 400, 404, 409, minden más: 500);
 *  - 400-as validációs hibánál a backend "errors" objektumát mezőnként kilistázza.
 *
 *   <app-error-alert [error]="error" [labels]="{ name: 'Név' }"></app-error-alert>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [KeyValuePipe],
  selector: 'app-error-alert',
  styleUrl: './error-alert.scss',
  templateUrl: './error-alert.html',
})
export class ErrorAlert {
  @Input() error?: HttpErrorResponse;
  /** A mezőnevek címkéi, pl. { name: 'Név' }. Ha egy mező nincs benne, a neve látszik. */
  @Input() labels: Record<string, string> = {};

  private static readonly MESSAGES: Record<number, string> = {
    0: 'A szerver nem érhető el. Fut a backend?',
    400: 'Hibás adatok, kérlek javítsd ki őket!',
    404: 'Nincs ilyen elem.',
    409: 'A művelet nem hajtható végre, mert más adat hivatkozik erre az elemre.',
    500: 'Váratlan hiba történt a szerveren.',
  };

  protected get message(): string {
    return ErrorAlert.MESSAGES[this.error?.status ?? 500] ?? ErrorAlert.MESSAGES[500];
  }

  /** A backend GlobalExceptionHandler-e által küldött mezőhibák: { name: "...", program: "..." } */
  protected get fieldErrors(): Record<string, string> | undefined {
    return this.error?.error?.errors;
  }
}
