import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ProgramPipe } from './program-pipe';

describe('ProgramPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    // a pipe inject()-et használ, ezért injection contextben kell létrehozni
    const pipe = TestBed.runInInjectionContext(() => new ProgramPipe());
    expect(pipe).toBeTruthy();
  });
});
