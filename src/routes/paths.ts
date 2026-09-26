import type { IconName } from '@/components/ui/Icon';

/** Central route table. */
export const ROUTES = {
  /** Public landing page. */
  home: '/',
  login: '/login',
  /** Where server-side OAuth (Discord) returns after setting the session cookie. */
  authCallback: '/auth/callback',
  /** Dashboard (requires a session or local mode). */
  app: '/app',
  courses: '/app/courses',
  timetable: '/app/timetable',
  commitments: '/app/commitments',
  studyLog: '/app/study-log',
  timer: '/app/timer',
  stats: '/app/stats',
  settings: '/app/settings',
  /** Standalone timetable page (was /university-timetable.html). */
  standaloneTimetable: '/university-timetable',
} as const;

export const coursePath = (id: string) => `${ROUTES.courses}/${encodeURIComponent(id)}`;

/** Pre-/app URLs from the first React release, kept as redirects for bookmarks. */
export const LEGACY_REDIRECTS: Array<[string, string]> = [
  ['/courses', ROUTES.courses],
  ['/timetable', ROUTES.timetable],
  ['/commitments', ROUTES.commitments],
  ['/study-log', ROUTES.studyLog],
];

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Exact match only (dashboard root). */
  end?: boolean;
}

/** Primary sections. The timer lives in the top bar (focus control), not in this list. */
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.app, label: 'الرئيسية', icon: 'home', end: true },
  { to: ROUTES.courses, label: 'المواد', icon: 'book' },
  { to: ROUTES.timetable, label: 'الجدول', icon: 'calendar' },
  { to: ROUTES.commitments, label: 'الالتزامات', icon: 'clipboard' },
  { to: ROUTES.studyLog, label: 'سجل المذاكرة', icon: 'history' },
  { to: ROUTES.stats, label: 'الإحصائيات', icon: 'chart' },
  { to: ROUTES.settings, label: 'الإعدادات', icon: 'settings' },
];

/** Accepts only same-site relative paths as post-login destinations (mirrors the server check). */
export function safeNextPath(value: string | null | undefined, fallback: string = ROUTES.app): string {
  if (!value || value.length > 512 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function loginPath(options: { next?: string; mode?: 'signup' } = {}): string {
  const params = new URLSearchParams();
  if (options.mode) params.set('mode', options.mode);
  if (options.next && options.next !== ROUTES.app) params.set('next', options.next);
  const query = params.toString();
  return query ? `${ROUTES.login}?${query}` : ROUTES.login;
}
