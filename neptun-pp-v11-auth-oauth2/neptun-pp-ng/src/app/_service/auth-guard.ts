import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/** Bejelentkezés nélkül a /login oldalra irányít. (A valódi védelem a backenden van!) */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn || inject(Router).createUrlTree(['/login']);
