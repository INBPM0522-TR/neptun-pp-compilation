export interface Student {
  neptun: string;
  name: string;
  program: string;
  created: string;
  updated: string;
}

export namespace Student {
  export type Key = keyof Student;
  
  export function empty() {
    return {} as Student;
  }
  
  export const keys: readonly Student.Key[] = [
    'neptun', 'name', 'program', 'created', 'updated'
  ];
}
