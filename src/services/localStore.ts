import type { PlannerData } from '@/types';
import { IDB, STORAGE_KEYS, readLocalJson, writeLocal } from '@/lib/storageKeys';
import { normalizePlannerData, withoutAttachments } from '@/lib/plannerData';

/**
 * On-device storage: the full planner (with attachments) lives in IndexedDB,
 * and an attachment-free copy in localStorage acts as a legacy fallback.
 */

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB.name, IDB.version);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB.store)) req.result.createObjectStore(IDB.store);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(): Promise<PlannerData | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB.store).objectStore(IDB.store).get(IDB.key);
    req.onsuccess = () => resolve(req.result as PlannerData | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(value: PlannerData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB.store, 'readwrite');
    tx.objectStore(IDB.store).put(value, IDB.key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage write aborted'));
  });
}

/** Writes both copies. Rejects only if the IndexedDB write fails. */
export function saveLocal(data: PlannerData): Promise<void> {
  writeLocal(STORAGE_KEYS.plannerFallback, JSON.stringify(withoutAttachments(data)));
  return idbPut(data);
}

/** Loads the on-device planner: IndexedDB first, then the legacy localStorage copy. */
export async function restoreLocal(): Promise<PlannerData> {
  const legacy = readLocalJson<PlannerData | null>(STORAGE_KEYS.plannerFallback, null);
  try {
    const stored = await idbGet();
    if (stored) return normalizePlannerData(stored);
    if (legacy) {
      const data = normalizePlannerData(legacy);
      await idbPut(data);
      return data;
    }
  } catch {
    /* fall back to localStorage below */
  }
  return normalizePlannerData(legacy);
}

export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
