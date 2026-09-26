import type { TimetableCell, TimetableSubject, Weekday } from '@/types';
import { TIMETABLE } from './timetableData';
import { parseTimeRange, splitMeta, type ClockRange } from './classTimes';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';

export const DAY_NAMES: Record<Weekday, string> = {
  Friday: 'الجمعة',
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const DAY_KEYS = Object.keys(TIMETABLE) as Weekday[];
export const GROUPS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Section weeks alternate 1/2 every Friday, starting Friday 25 Sep 2026. */
const SECTION_ANCHOR = Date.UTC(2026, 8, 25);

export interface WeekInfo {
  section: 1 | 2;
  label: string;
}

export function getWeekInfo(date = new Date()): WeekInfo {
  const weekdayOffset = (date.getDay() - 5 + 7) % 7;
  let friday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayOffset);
  let fridayUtc = Date.UTC(friday.getFullYear(), friday.getMonth(), friday.getDate());
  if (fridayUtc < SECTION_ANCHOR) {
    friday = new Date(2026, 8, 25);
    fridayUtc = SECTION_ANCHOR;
  }
  const weekIndex = Math.floor((fridayUtc - SECTION_ANCHOR) / 604800000);
  const section = ((((weekIndex % 2) + 2) % 2) + 1) as 1 | 2;
  const thursday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 6);
  const fmt = (d: Date) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(d);
  return { section, label: `من ${fmt(friday)} إلى ${fmt(thursday)}` };
}

export function todayWeekday(): Weekday {
  return weekdayOf(Date.now()) ?? DAY_KEYS[0];
}

export interface VisibleSubject extends TimetableSubject {
  /** Second subject within the same cell (rendered with a dashed divider). */
  secondary: boolean;
}

/** Hides "(1)"/"(2)" section-only classes that are not on in the given week. */
export function visibleSubjects(cell: TimetableCell, section: number): VisibleSubject[] {
  return cell.subjects
    .map((s, i) => ({ ...s, secondary: i > 0 }))
    .filter(s => {
      const tag = /^\((1|2|1\s*&\s*2)\)/.exec(s.title.trim());
      return !(tag && (tag[1] === '1' || tag[1] === '2') && Number(tag[1]) !== section);
    });
}

export interface ClassSlot {
  key: string;
  label: string;
  subjects: VisibleSubject[];
}

export interface PeriodSlot {
  period: number;
  time: string;
  classes: ClassSlot[];
}

/** Periods for one day with the group/section filters applied (empty periods dropped). */
export function periodsFor(day: Weekday, group: string, section: number): PeriodSlot[] {
  return (TIMETABLE[day] ?? [])
    .map(row => {
      let next = 1;
      const classes: ClassSlot[] = [];
      row.cells.forEach((cell, i) => {
        const first = next;
        const last = next + cell.span - 1;
        next += cell.span;
        if (!cell.subjects.length) return;
        if (group && (Number(group) < first || Number(group) > last)) return;
        const subjects = visibleSubjects(cell, section);
        if (!subjects.length) return;
        const label = group ? `المجموعة ${group}` : first === last ? `المجموعة ${first}` : `المجموعات ${first}–${last}`;
        classes.push({ key: `${row.period}-${i}`, label, subjects });
      });
      return { period: row.period, time: row.time, classes };
    })
    .filter(p => p.classes.length > 0);
}

function groupText(groups: number[]): string {
  if (groups.length === 1) return `المجموعة ${groups[0]}`;
  const sequential = groups.every((n, i) => i === 0 || n === groups[i - 1] + 1);
  return sequential ? `المجموعات ${groups[0]}–${groups[groups.length - 1]}` : `المجموعات ${groups.join('، ')}`;
}

/** Plain-text schedule for the "copy" dialog (same format as before). */
export function buildScheduleText(selectedGroups: number[] | null, selectedDays: Weekday[] | null, info: WeekInfo): string {
  const days = selectedDays ?? DAY_KEYS;
  const lines = [
    'الجدول الدراسي — تكنولوجيا الأمن السيبراني',
    `أسبوع ${info.section} (${info.label})`,
    'الأيام: ' + (selectedDays ? selectedDays.map(d => DAY_NAMES[d]).join('، ') : 'كل الأيام'),
    'المجموعات: ' + (selectedGroups ? selectedGroups.map(n => `المجموعة ${n}`).join('، ') : 'كل المجموعات'),
    '',
  ];
  days.forEach(day => {
    const dayLines: string[] = [];
    (TIMETABLE[day] ?? []).forEach(row => {
      let next = 1;
      const entries: Array<{ groups: number[]; subjects: VisibleSubject[] }> = [];
      row.cells.forEach(cell => {
        const first = next;
        const last = next + cell.span - 1;
        next += cell.span;
        if (!cell.subjects.length) return;
        const groups = selectedGroups
          ? selectedGroups.filter(n => n >= first && n <= last)
          : Array.from({ length: cell.span }, (_, i) => first + i);
        if (!groups.length) return;
        const subjects = visibleSubjects(cell, info.section);
        if (!subjects.length) return;
        entries.push({ groups, subjects });
      });
      if (!entries.length) return;
      dayLines.push(`الفترة ${row.period} · ${row.time}`);
      entries.forEach(e =>
        dayLines.push('  - ' + groupText(e.groups) + ': ' + e.subjects.map(s => s.title + (s.meta ? ' — ' + s.meta : '')).join(' ؛ ')),
      );
    });
    if (dayLines.length) lines.push(DAY_NAMES[day], ...dayLines, '');
  });
  return lines.join('\n').trim();
}

/** The timetable's English weekday key for a timestamp (null on days without classes). */
export function weekdayOf(ts: number): Weekday | null {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(ts) as Weekday;
  return DAY_KEYS.includes(name) ? name : null;
}

/** One class as shown in the app: parsed times plus instructor/room split out of `meta`. */
export interface UniClass {
  key: string;
  period: number;
  time: string;
  range: ClockRange | null;
  title: string;
  instructor: string;
  room: string;
  /** Group label ("المجموعة 2" / "المجموعات 1–4"). */
  label: string;
  /** Other subjects sharing the slot (rare: two classes in one cell). */
  extra: VisibleSubject[];
}

/** Flattened classes for a day/group/section week, in period order. */
export function classesFor(day: Weekday, group: string, section: number): UniClass[] {
  return periodsFor(day, group, section).flatMap(p =>
    p.classes.map(cls => {
      const [first, ...extra] = cls.subjects;
      const { instructor, room } = splitMeta(first.meta);
      return { key: cls.key, period: p.period, time: p.time, range: parseTimeRange(p.time), title: first.title, instructor, room, label: cls.label, extra };
    }),
  );
}

/** The student's group (1–8) saved on this device, or '' for all groups. */
export function savedGroup(): string {
  const saved = readLocal(STORAGE_KEYS.timetableGroup) ?? '';
  return /^[1-8]$/.test(saved) ? saved : '';
}

export function saveGroup(group: string): void {
  writeLocal(STORAGE_KEYS.timetableGroup, /^[1-8]$/.test(group) ? group : null);
}
