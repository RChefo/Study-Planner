import type { DueInfo } from '@/features/insights/selectors';
import { DAY_MS, dayKey } from '@/features/insights/selectors';

/** Arabic text with Latin digits, matching the rest of the interface (e.g. 24:57, 18 د). */
const LOCALE = 'ar-EG-u-nu-latn';

/** Arabic count phrase with dual/plural forms: 1 يوم، يومان، 3 أيام، 11 يومًا. */
function arabicCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const daysPhrase = (n: number) => arabicCount(n, 'يوم', 'يومين', 'أيام', 'يومًا');

/** "25 د" · "1 س 5 د" · "2 س". */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} د`;
  return r ? `${h} س ${r} د` : `${h} س`;
}

const time = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });

export const formatTime = (ts: number) => time.format(ts);
export const formatShortDate = (ts: number) => shortDate.format(ts);
export const formatLongDay = (ts: number) => longDate.format(ts);
export const formatWeekday = (ts: number) => weekday.format(ts);

/** "اليوم" · "أمس" · "منذ 3 أيام" · "12 سبتمبر". */
export function relativeDay(ts: number, now: number): string {
  const key = dayKey(ts);
  if (key === dayKey(now)) return 'اليوم';
  if (key === dayKey(now - DAY_MS)) return 'أمس';
  const days = Math.round((new Date(`${dayKey(now)}T12:00:00`).getTime() - new Date(`${key}T12:00:00`).getTime()) / DAY_MS);
  if (days > 0 && days < 7) return `منذ ${daysPhrase(days)}`;
  return formatShortDate(ts);
}

/** Human due-date phrase for commitments. */
export function dueText(due: DueInfo): string {
  switch (due.state) {
    case 'none':
      return 'بدون موعد';
    case 'overdue':
      return `متأخر ${daysPhrase(-(due.days ?? 0))}`;
    case 'today':
      return 'اليوم';
    case 'tomorrow':
      return 'غدًا';
    default:
      return `بعد ${daysPhrase(due.days ?? 0)}`;
  }
}

export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'مساء الخير';
  if (h < 12) return 'صباح الخير';
  return 'مساء الخير';
}
