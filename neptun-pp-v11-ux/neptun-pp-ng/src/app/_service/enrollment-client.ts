import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Enrollment } from '../_model/enrollment';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentClient {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = '/api/enrollment';

  public findAll(): Observable<Enrollment[]> {
    return this.httpClient.get<Enrollment[]>(this.baseUrl);
  }
}
