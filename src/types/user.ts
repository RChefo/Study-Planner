export type AuthProvider = 'google' | 'discord';

/** Signed-in profile as returned by /api/auth/google and /api/auth/me. */
export interface User {
  /** Google account id, or `discord:<id>` for Discord accounts. */
  sub: string;
  email: string;
  name: string;
  picture: string;
  provider?: AuthProvider;
}
