import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

/** Bejelentkezve kapott 401: a session lejárt (vagy újraindult a backend) → bejelentkező oldal. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.loggedIn) {
        auth.clear();
      }
      return throwError(() => error);
    }),
  );
};
