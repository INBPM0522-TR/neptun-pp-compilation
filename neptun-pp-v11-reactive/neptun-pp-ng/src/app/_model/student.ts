export interface Student {
  neptun: string;
  name: string;
  program: string;
  created: string;
  updated: string;
}

export namespace Student {
  export type Key = keyof Student;

  /** Új hallgató: a Signal Forms a mezőkből építi fel az űrlapot, ezért legyenek meg */
  export function empty(): Student {
    return { neptun: '', name: '', program: '' } as Student;
  }

  export const keys: readonly Student.Key[] = [
    'neptun', 'name', 'program', 'created', 'updated'
  ];
}
