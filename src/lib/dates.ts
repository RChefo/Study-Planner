export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Local YYYY-MM-DD. */
export function dateKey(value: Date | number | string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function formatLogDate(ms: number): string {
  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** "موعد التسليم: <date> · " — identical text to the original commitments list. */
export function dueLabel(date: string): string {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00`);
  const formatted = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return `موعد التسليم: ${formatted} · `;
}

export function formatClock(ms: number): string {
  const sec = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
