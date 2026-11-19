/** A backend /api/user válasza (a GitHub felhasználó adatai) */
export interface User {
  login: string;
  name?: string;
  avatarUrl: string;
}
