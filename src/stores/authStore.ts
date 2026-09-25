import { create } from 'zustand';
import type { User } from '@/types';
import type { AuthErrorCode } from '@/i18n/messages';

/**
 * - loading:       checking the session on startup
 * - authenticated: signed in (Google or Discord); cloud sync active once `cloudReady`
 * - local:         "continue without an account" — data stays on this device
 * - anonymous:     neither; the dashboard redirects to /login
 */
export type SessionStatus = 'loading' | 'authenticated' | 'local' | 'anonymous';

export interface AuthFields {
  status: SessionStatus;
  user: User | null;
  /** Cloud copy has been loaded/merged; local edits may now be pushed. */
  cloudReady: boolean;
  /** /api/config has answered (or failed). */
  configLoaded: boolean;
  googleClientId: string;
  discordEnabled: boolean;
  /** Something the sign-in page should explain (expired session, server unreachable…). */
  notice: AuthErrorCode | null;
}

interface AuthState extends AuthFields {
  patch: (patch: Partial<AuthFields>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  status: 'loading',
  user: null,
  cloudReady: false,
  configLoaded: false,
  googleClientId: '',
  discordEnabled: false,
  notice: null,
  patch: patch => set(patch),
}));

export const authState = () => useAuthStore.getState();
export const patchAuth = (patch: Partial<AuthFields>) => useAuthStore.getState().patch(patch);
