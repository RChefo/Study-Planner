/** Browser storage keys used by the original app — do not rename, or users lose local data. */
export const STORAGE_KEYS = {
  plannerFallback: 'rafiq-study-v1',
  timer: 'rafiq-pomodoro-v1',
  cloudFileMap: 'rafiq-cloud-files-v1',
  lastCloudUser: 'rafiq-last-user-v1',
  timetableGroup: 'studyPlannerTimetableGroup',
} as const;

export const IDB = { name: 'rafiq-study-storage', version: 1, store: 'state', key: 'main' } as const;

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage full or blocked — same silent fallback as before */
  }
}

export function readLocalJson<T>(key: string, fallback: T): T {
  const raw = readLocal(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
