import { Student } from './student';
import { Subject } from './subject';

export interface Enrollment {
  id: string;
  student: Student;
  subject: Subject;
  grade?: number;
  created: string;
  updated: string;
}
