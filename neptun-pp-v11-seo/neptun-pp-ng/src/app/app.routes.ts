import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';

export const routes: Routes = [
  {
    path: 'student',
    component: StudentList,
    title: 'Hallgatók'
  },
  {
    path: 'student/create',
    component: StudentEdit,
    title: 'Új hallgató'
  },
  {
    path: 'student/:neptun',
    component: StudentEdit,
    // alapérték; a betöltés után a komponens a hallgató nevére cseréli
    title: 'Hallgató'
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
