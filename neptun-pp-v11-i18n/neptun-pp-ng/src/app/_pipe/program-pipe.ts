import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Szakkód → szaknév, most már az i18n JSON-ök "program" ágából (pl. program.CS_BSC).
 * pure: false, mert nyelvváltáskor a bemenet (a kód) nem változik, csak a fordítás.
 */
@Pipe({
  name: 'program',
  pure: false,
})
export class ProgramPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(code: string): string {
    return this.translate.instant(`program.${code}`);
  }
}
