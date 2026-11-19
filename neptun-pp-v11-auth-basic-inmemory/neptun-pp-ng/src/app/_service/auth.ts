import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User } from '../_model/user';

/**
 * HTTP Basic autentikáció: a felhasználónév és a jelszó minden kérésben elmegy
 * (Authorization: Basic base64(név:jelszó)). Ezt az authInterceptor teszi a kérésekbe.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly STORAGE_KEY = 'neptun-pp-auth';

  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  /** A bejelentkezett felhasználó, vagy undefined */
  user?: User;
  /** A kész fejlécérték: "Basic dXNlcjp1c2Vy" */
  authorization?: string;

  constructor() {
    // oldalfrissítés után visszatöltjük (a sessionStorage a lap bezárásáig él)
    const saved = sessionStorage.getItem(AuthService.STORAGE_KEY);
    if (saved) {
      ({ user: this.user, authorization: this.authorization } = JSON.parse(saved));
    }
  }

  get loggedIn(): boolean {
    return !!this.authorization;
  }

  /** Ha a /api/user 200-at ad, jók az adatok: elmentjük őket. 401 → hibás név/jelszó. */
  login(username: string, password: string): Observable<User> {
    const authorization = `Basic ${btoa(`${username}:${password}`)}`;
    return this.httpClient
      .get<User>('/api/user', { headers: { Authorization: authorization } })
      .pipe(
        tap((user) => {
          this.user = user;
          this.authorization = authorization;
          sessionStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify({ user, authorization }));
        }),
      );
  }

  logout(): void {
    this.user = undefined;
    this.authorization = undefined;
    sessionStorage.removeItem(AuthService.STORAGE_KEY);
    this.router.navigate(['/login']);
  }
}
