import { Routes } from '@angular/router';
import { StudentList } from './_component/student-list/student-list';
import { StudentEdit } from './_component/student-edit/student-edit';
import { Login } from './_component/login/login';
import { authGuard } from './_service/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'student',
    component: StudentList,
    canActivate: [authGuard]
  },
  {
    path: 'student/create',
    component: StudentEdit,
    canActivate: [authGuard]
  },
  {
    path: 'student/:neptun',
    component: StudentEdit,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'student'
  }
];
