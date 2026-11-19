import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Minden kéréshez hozzáadja az Accept-Language fejlécet a kiválasztott nyelvvel,
 * így a backend (Hibernate Validator) a validációs üzeneteket is ezen a nyelven küldi.
 */
export const acceptLanguageInterceptor: HttpInterceptorFn = (request, next) => {
  const lang = inject(TranslateService).getCurrentLang();
  return next(lang ? request.clone({ setHeaders: { 'Accept-Language': lang } }) : request);
};
