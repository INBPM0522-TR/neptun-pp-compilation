import { inject, Injectable, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../_model/student';

@Injectable({
  providedIn: 'root',
})
export class StudentClient {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseUrl = '/api/student';

  public findAll(): Observable<Student[]> {
    return this.httpClient.get<Student[]>(this.baseUrl);
  }

  public findOne(neptun: string): Observable<Student> {
    return this.httpClient.get<Student>(`${this.baseUrl}/${neptun}`);
  }

  public createOne(student: Student): Observable<Student> {
    return this.httpClient.post<Student>(this.baseUrl, student);
  }

  public updateOne(student: Student): Observable<Student> {
    return this.httpClient.put<Student>(this.baseUrl, student);
  }

  public deleteOne(neptun: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${neptun}`);
  }

  /*
  constructor(
    private httpClient: HttpClient
  ) {
  }
   */
}
