import type { IconName } from '@/components/ui/Icon';
import { ROUTES } from '@/routes/paths';

/** One destination in the study workspace navigation. */
export interface NavStation {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

/**
 * Navigation follows the study workflow, not a flat list of pages: Today is the starting
 * point (rendered specially), then study → schedule → progress. Focus is not a station —
 * it is the primary action at the foot of the path. Settings sit apart.
 */
export const TODAY: NavStation = { to: ROUTES.app, label: 'اليوم', icon: 'home', end: true };

export const NAV_GROUPS: Array<{ id: string; label: string; stations: NavStation[] }> = [
  { id: 'study', label: 'الدراسة', stations: [{ to: ROUTES.courses, label: 'المواد', icon: 'book' }] },
  {
    id: 'schedule',
    label: 'المواعيد',
    stations: [
      { to: ROUTES.timetable, label: 'الجدول', icon: 'calendar' },
      { to: ROUTES.commitments, label: 'الالتزامات', icon: 'clipboard' },
    ],
  },
  {
    id: 'progress',
    label: 'التقدّم',
    stations: [
      { to: ROUTES.studyLog, label: 'سجل المذاكرة', icon: 'history' },
      { to: ROUTES.stats, label: 'الإحصائيات', icon: 'chart' },
    ],
  },
];

export const SETTINGS: NavStation = { to: ROUTES.settings, label: 'الإعدادات', icon: 'settings' };
