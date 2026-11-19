import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../_service/auth';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected username = '';
  protected password = '';
  protected error?: string;

  protected login(): void {
    this.error = undefined;
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/student']),
      error: (error: HttpErrorResponse) => {
        this.error =
          error.status === 401 ? 'Hibás felhasználónév vagy jelszó!' : 'A szerver nem érhető el.';
        this.cdr.markForCheck();
      },
    });
  }
}
