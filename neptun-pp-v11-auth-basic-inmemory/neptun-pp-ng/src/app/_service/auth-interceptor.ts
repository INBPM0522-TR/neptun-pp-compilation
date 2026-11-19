import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

/**
 * - Authorization: a bejelentkezett felhasználó Basic fejléce minden kérésbe;
 * - X-Requested-With: ettől a Spring Security 401-nél nem küld "WWW-Authenticate: Basic"
 *   fejlécet, így a böngésző nem dobja fel a saját bejelentkező ablakát.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
  if (auth.authorization && !request.headers.has('Authorization')) {
    headers['Authorization'] = auth.authorization;
  }

  return next(request.clone({ setHeaders: headers })).pipe(
    catchError((error: HttpErrorResponse) => {
      // bejelentkezve kaptunk 401-et: a tárolt adatok már nem jók
      if (error.status === 401 && auth.loggedIn) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
