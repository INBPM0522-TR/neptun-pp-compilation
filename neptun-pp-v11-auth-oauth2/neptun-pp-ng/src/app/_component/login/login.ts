import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../_service/auth';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthService);
}
