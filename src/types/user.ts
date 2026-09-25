/** Google profile as returned by /api/auth/google and /api/auth/me. */
export interface User {
  sub: string;
  email: string;
  name: string;
  picture: string;
}
