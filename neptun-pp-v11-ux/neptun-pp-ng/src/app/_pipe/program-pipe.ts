import { Pipe, PipeTransform } from '@angular/core';
import { programs } from '../app.constants';

@Pipe({
  name: 'program',
})
export class ProgramPipe implements PipeTransform {
  transform(code: string): string {
    return programs.get(code)!;
  }
}
