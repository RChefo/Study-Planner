import { create } from 'zustand';

/**
 * Cloud sync status for the UI:
 * - idle:    nothing to sync (local mode / signed out)
 * - syncing: a push is in flight
 * - synced:  cloud copy matches this device
 * - pending: local changes waiting for the next attempt (debounce or retry backoff)
 * - offline: the browser has no connection; will retry when it comes back
 * - error:   the server rejected the data or the retry budget is exhausted
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  nextRetryAt: number | null;
  patch: (patch: Partial<Omit<SyncState, 'patch'>>) => void;
}

export const useSyncStore = create<SyncState>(set => ({
  status: 'idle',
  lastSyncedAt: null,
  nextRetryAt: null,
  patch: patch => set(patch),
}));

export const patchSync = (patch: Partial<Omit<SyncState, 'patch'>>) => useSyncStore.getState().patch(patch);
