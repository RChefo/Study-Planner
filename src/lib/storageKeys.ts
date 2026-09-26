/** Browser storage keys used by the original app — do not rename, or users lose local data. */
export const STORAGE_KEYS = {
  plannerFallback: 'rafiq-study-v1',
  timer: 'rafiq-pomodoro-v1',
  cloudFileMap: 'rafiq-cloud-files-v1',
  lastCloudUser: 'rafiq-last-user-v1',
  timetableGroup: 'studyPlannerTimetableGroup',
  /** Set when the user chose "continue without an account", so they skip the sign-in page next time. */
  localMode: 'study-planner-local-mode-v1',
  /** Language of the public pages (landing / sign-in). */
  locale: 'study-planner-locale',
  /** Desktop sidebar collapsed state (previous navigation; no longer read). */
  sidebarCollapsed: 'study-planner-sidebar-collapsed',
  /** Desktop navigation rail shows labels (opt-in; compact by default). */
  navExpanded: 'study-planner-nav-expanded',
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
