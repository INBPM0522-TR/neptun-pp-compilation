import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';

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
    path: '**',
    redirectTo: 'student'
  }
];
