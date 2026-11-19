import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { User } from '../_model/user';

/**
 * OAuth 2.0 (GitHub): a bejelentkezést teljesen a backend intézi, az eredmény egy
 * session süti (JSESSIONID, HttpOnly: JavaScriptből nem látszik). A frontend csak
 * megkérdezi a backendtől, ki van bejelentkezve.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  /** A bejelentkezett felhasználó, vagy undefined */
  user?: User;

  get loggedIn(): boolean {
    return !!this.user;
  }

  /** Induláskor: van-e már érvényes sessionünk? (200 → igen, 401 → nem) */
  load(): Observable<unknown> {
    return this.httpClient.get<User>('/api/user').pipe(
      tap((user) => (this.user = user)),
      catchError(() => of(undefined)),
    );
  }

  /** Teljes oldalas navigáció: backend → GitHub → backend → vissza ide (4200) */
  login(): void {
    window.location.href = '/oauth2/authorization/github';
  }

  /** POST /logout: a backend érvényteleníti a sessiont (a CSRF fejlécet az Angular teszi bele). */
  logout(): void {
    this.httpClient
      .post('/logout', null)
      .pipe(finalize(() => this.clear()))
      .subscribe({ error: () => {} });
  }

  /** Kijelentkezett állapot (pl. lejárt a session) → bejelentkező oldal */
  clear(): void {
    this.user = undefined;
    this.router.navigate(['/login']);
  }
}
