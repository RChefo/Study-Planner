/**
 * Pure helpers for the university timetable's time strings (no store/alias imports, so
 * they are unit-tested directly). The source table writes afternoon periods without a
 * meridiem ("02:00 - 03:00"); classes run 09:00–20:00, so hours below 8 are afternoon.
 */

/** Minutes since local midnight. */
export interface ClockRange {
  start: number;
  end: number;
}

const toMinutes = (h: string, m: string) => {
  let hour = Number(h);
  if (hour < 8) hour += 12;
  return hour * 60 + Number(m);
};

export function parseTimeRange(text: string): ClockRange | null {
  const match = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return null;
  const start = toMinutes(match[1], match[2]);
  let end = toMinutes(match[3], match[4]);
  // "07:00 - 08:00" is 19:00–20:00: an end that lands before the start is also afternoon.
  if (end <= start) end += 12 * 60;
  return end > start && end - start <= 6 * 60 ? { start, end } : null;
}

/** "Dr. Hany Muhammed / A303" → instructor + room (room is the part after the last slash). */
export function splitMeta(meta: string): { instructor: string; room: string } {
  const i = meta.lastIndexOf('/');
  if (i < 0) return { instructor: meta.trim(), room: '' };
  return { instructor: meta.slice(0, i).trim(), room: meta.slice(i + 1).trim() };
}

/** Timestamp for `minutes` past midnight on the calendar day of `day`. */
export function atMinutes(day: number, minutes: number): number {
  const d = new Date(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.getTime();
}
