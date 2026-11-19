import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject } from '../_model/subject';

@Injectable({
  providedIn: 'root',
})
export class SubjectClient {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = '/api/subject';

  public findAll(): Observable<Subject[]> {
    return this.httpClient.get<Subject[]>(this.baseUrl);
  }
}
