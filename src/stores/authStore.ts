import { create } from 'zustand';
import type { User } from '@/types';

export interface AuthFields {
  user: User | null;
  /** User chose to keep using on-device data only. */
  localMode: boolean;
  /** Cloud copy has been loaded/merged; local edits may now be pushed. */
  cloudReady: boolean;
  gateOpen: boolean;
  /** True once the gate has been dismissed at least once (the timer resumes then). */
  started: boolean;
  message: string;
  googleClientId: string;
}

interface AuthState extends AuthFields {
  patch: (patch: Partial<AuthFields>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  localMode: false,
  cloudReady: false,
  gateOpen: true,
  started: false,
  message: 'جارٍ الاتصال بالخدمة…',
  googleClientId: '',
  patch: patch => set(patch.gateOpen === false ? { ...patch, started: true } : patch),
}));

export const authState = () => useAuthStore.getState();
export const patchAuth = (patch: Partial<AuthFields>) => useAuthStore.getState().patch(patch);
