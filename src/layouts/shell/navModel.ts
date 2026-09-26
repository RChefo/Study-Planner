import type { IconName } from '@/components/ui/Icon';
import { ROUTES } from '../../routes/paths.ts';

export type StationGroup = 'today' | 'study' | 'plan' | 'progress';

/** One stop on the study path. `weight` sets visual prominence, not order. */
export interface Station {
  to: string;
  label: string;
  icon: IconName;
  group: StationGroup;
  weight: 'home' | 'primary' | 'secondary';
  end?: boolean;
}

/**
 * The path a student walks: Today first, then study, plan and progress. Focus is not a
 * station (it is an action, see FocusControl) and Settings sits off the path.
 */
export const STATIONS: Station[] = [
  { to: ROUTES.app, label: 'اليوم', icon: 'home', group: 'today', weight: 'home', end: true },
  { to: ROUTES.courses, label: 'المواد', icon: 'book', group: 'study', weight: 'primary' },
  { to: ROUTES.studyLog, label: 'سجل المذاكرة', icon: 'history', group: 'study', weight: 'secondary' },
  { to: ROUTES.timetable, label: 'الجدول', icon: 'calendar', group: 'plan', weight: 'primary' },
  { to: ROUTES.commitments, label: 'الالتزامات', icon: 'clipboard', group: 'plan', weight: 'secondary' },
  { to: ROUTES.stats, label: 'الإحصائيات', icon: 'chart', group: 'progress', weight: 'primary' },
];

export const GROUP_LABEL: Record<StationGroup, string> = { today: 'البداية', study: 'الدراسة', plan: 'الخطة', progress: 'التقدّم' };
export const GROUP_ORDER: StationGroup[] = ['today', 'study', 'plan', 'progress'];

export const SETTINGS: Station = { to: ROUTES.settings, label: 'الإعدادات', icon: 'settings', group: 'progress', weight: 'secondary' };

/** Which station the student is at for a pathname (-1 when off the path, e.g. settings or focus mode). */
export function stationIndex(pathname: string): number {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === ROUTES.app) return 0;
  return STATIONS.findIndex((s, i) => i > 0 && (path === s.to || path.startsWith(`${s.to}/`)));
}
