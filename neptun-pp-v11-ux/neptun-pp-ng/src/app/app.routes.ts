import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';
import { SubjectList } from './_component/subject-list/subject-list';
import { EnrollmentList } from './_component/enrollment-list/enrollment-list';

export const routes: Routes = [
  {
    path: 'student',
    component: StudentList
  },
  {
    path: 'student/create',
    component: StudentEdit
  },
  {
    path: 'student/:neptun',
    component: StudentEdit
  },
  {
    path: 'subject',
    component: SubjectList
  },
  {
    path: 'enrollment',
    component: EnrollmentList
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
