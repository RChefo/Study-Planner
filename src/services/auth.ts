import type { AuthResponse, ConfigResponse, User } from '@/types';
import { apiFetch, apiRequest } from './api';

export const getConfig = () => apiRequest<ConfigResponse>('/api/config');

export const signInWithGoogle = (credential: string) =>
  apiRequest<AuthResponse>('/api/auth/google', { method: 'POST', body: { credential } });

/** Current session user, or null when there is no valid session cookie. */
export async function getCurrentUser(): Promise<User | null> {
  const response = await apiFetch('/api/auth/me');
  if (!response.ok) return null;
  const body = (await response.json()) as AuthResponse;
  return body.user;
}

export const logout = () => apiRequest<null>('/api/auth/logout', { method: 'POST' });

/** Revokes every session of the signed-in user (all devices). */
export const logoutEverywhere = () => apiRequest<null>('/api/auth/logout-all', { method: 'POST' });

/** Full-page redirect target that starts the server-side Discord OAuth flow. */
export const discordSignInUrl = (next: string) => `/api/auth/discord/start?next=${encodeURIComponent(next)}`;
