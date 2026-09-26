/**
 * The student-built timetable, as pure functions (no React, no stores, relative imports only)
 * so every rule is unit-tested: times, days, profiles, periods, entries, copying, conflicts,
 * free gaps, validation, import of the built-in university table, and normalisation of
 * untrusted data. All operations are immutable and take `now`/ids from the caller.
 */
import type { ClassType, DayId, EntryColor, TimeMode, TimetableDisplay, TimetableEntry, TimetablePeriod, TimetableProfile } from '../../types/planner.ts';
import { TIMETABLE } from './timetableData.ts';
import { parseTimeRange, splitMeta } from './classTimes.ts';

/* ---------- time ---------- */

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (t: unknown): t is string => typeof t === 'string' && TIME_RE.test(t);
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m: number) => {
  const c = Math.max(0, Math.min(23 * 60 + 59, Math.round(m)));
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
};
export const durationMin = (e: { start: string; end: string }) => toMin(e.end) - toMin(e.start);

/* ---------- days ---------- */

/** Calendar order starting Saturday; any day can be the week's first day. */
export const DAY_IDS: DayId[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
export const DAY_LABEL: Record<DayId, string> = { sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة' };
const JS_DAY: DayId[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const dayOf = (ts: number): DayId => JS_DAY[new Date(ts).getDay()];

/** Week presets offered when creating a timetable (the student can change days any time). */
export const WEEK_PRESETS: Array<{ id: string; label: string; days: DayId[]; firstDay: DayId }> = [
  { id: 'sun-thu', label: 'الأحد – الخميس', days: ['sun', 'mon', 'tue', 'wed', 'thu'], firstDay: 'sun' },
  { id: 'sat-thu', label: 'السبت – الخميس', days: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'], firstDay: 'sat' },
  { id: 'mon-fri', label: 'الاثنين – الجمعة', days: ['mon', 'tue', 'wed', 'thu', 'fri'], firstDay: 'mon' },
];

/** The profile's days in week order starting from its first day. */
export function orderedDays(p: Pick<TimetableProfile, 'days' | 'firstDay'>): DayId[] {
  const start = DAY_IDS.indexOf(p.firstDay);
  const week = [...DAY_IDS.slice(start), ...DAY_IDS.slice(0, start)];
  return week.filter(d => p.days.includes(d));
}

/* ---------- labels ---------- */

export const CLASS_TYPES: Array<{ id: ClassType; label: string }> = [
  { id: 'lecture', label: 'محاضرة' },
  { id: 'tutorial', label: 'سكشن' },
  { id: 'lab', label: 'عملي' },
  { id: 'seminar', label: 'سيمينار' },
  { id: 'exam', label: 'امتحان' },
  { id: 'other', label: 'أخرى' },
];
export const typeLabel = (t: ClassType | null | undefined) => CLASS_TYPES.find(x => x.id === t)?.label ?? '';
export const ENTRY_COLORS: EntryColor[] = ['forest', 'gold', 'clay', 'sky', 'plum', 'slate'];

export const DEFAULT_DISPLAY: TimetableDisplay = { density: 'detailed', showRoom: true, showInstructor: true, showGroup: true };

/* ---------- profiles ---------- */

export interface TimetableState {
  timetables: TimetableProfile[];
  activeTimetableId: string | null;
}

export function newProfile(input: { id: string; name: string; now: number; days?: DayId[]; firstDay?: DayId; mode?: TimeMode; description?: string }): TimetableProfile {
  const days = input.days?.length ? DAY_IDS.filter(d => input.days!.includes(d)) : WEEK_PRESETS[0].days;
  return {
    id: input.id,
    name: input.name.trim().slice(0, 80) || 'جدولي',
    ...(input.description ? { description: input.description.trim().slice(0, 300) } : {}),
    days,
    firstDay: input.firstDay && days.includes(input.firstDay) ? input.firstDay : orderedDays({ days, firstDay: 'sat' })[0] ?? 'sat',
    mode: input.mode ?? 'free',
    dayStart: '08:00',
    dayEnd: '18:00',
    periods: [],
    groups: [],
    display: { ...DEFAULT_DISPLAY },
    entries: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

const touch = (p: TimetableProfile, now: number): TimetableProfile => ({ ...p, updatedAt: now });
const mapProfile = (s: TimetableState, id: string, fn: (p: TimetableProfile) => TimetableProfile): TimetableState => ({
  ...s,
  timetables: s.timetables.map(p => (p.id === id ? fn(p) : p)),
});

export function addProfile(s: TimetableState, p: TimetableProfile, makeActive = true): TimetableState {
  return { timetables: [...s.timetables, p], activeTimetableId: makeActive || !s.activeTimetableId ? p.id : s.activeTimetableId };
}

export const updateProfile = (s: TimetableState, id: string, patch: Partial<Omit<TimetableProfile, 'id' | 'entries' | 'createdAt'>>, now: number) =>
  mapProfile(s, id, p => touch({ ...p, ...patch }, now));

export const renameProfile = (s: TimetableState, id: string, name: string, now: number) => updateProfile(s, id, { name: name.trim().slice(0, 80) || 'جدولي' }, now);

/** A full copy (structure + classes) with fresh ids for the profile, periods and entries. */
export function duplicateProfile(s: TimetableState, id: string, ids: { profile: string; next: () => string }, now: number, name?: string): TimetableState {
  const src = s.timetables.find(p => p.id === id);
  if (!src) return s;
  const periodMap = new Map(src.periods.map(pe => [pe.id, ids.next()]));
  const copy: TimetableProfile = {
    ...src,
    id: ids.profile,
    name: (name ?? `${src.name} (نسخة)`).slice(0, 80),
    archived: false,
    periods: src.periods.map(pe => ({ ...pe, id: periodMap.get(pe.id)! })),
    entries: src.entries.map(e => ({ ...e, id: ids.next(), periodId: e.periodId ? (periodMap.get(e.periodId) ?? null) : e.periodId })),
    createdAt: now,
    updatedAt: now,
  };
  return addProfile(s, copy, false);
}

export const setActive = (s: TimetableState, id: string): TimetableState => (s.timetables.some(p => p.id === id && !p.archived) ? { ...s, activeTimetableId: id } : s);

/** Archiving hides a profile from switching; the active one falls back to another live profile. */
export function setArchived(s: TimetableState, id: string, archived: boolean, now: number): TimetableState {
  const next = mapProfile(s, id, p => touch({ ...p, archived }, now));
  if (archived && next.activeTimetableId === id) next.activeTimetableId = next.timetables.find(p => !p.archived)?.id ?? null;
  if (!archived && !next.activeTimetableId) next.activeTimetableId = id;
  return next;
}

export function deleteProfile(s: TimetableState, id: string): TimetableState {
  const timetables = s.timetables.filter(p => p.id !== id);
  const activeTimetableId = s.activeTimetableId === id ? (timetables.find(p => !p.archived)?.id ?? null) : s.activeTimetableId;
  return { timetables, activeTimetableId };
}

/**
 * Days: removing a day never deletes its classes silently — they stay in the data (hidden)
 * and come back if the day is re-enabled. `hiddenEntries` tells the UI how many are hidden.
 */
export function setDays(s: TimetableState, id: string, days: DayId[], now: number): TimetableState {
  const clean = DAY_IDS.filter(d => days.includes(d));
  if (!clean.length) return s;
  return mapProfile(s, id, p => touch({ ...p, days: clean, firstDay: clean.includes(p.firstDay) ? p.firstDay : orderedDays({ days: clean, firstDay: p.firstDay })[0] }, now));
}
export const hiddenEntries = (p: TimetableProfile) => p.entries.filter(e => !p.days.includes(e.day)).length;

/** Copies the week structure (days, mode, periods, hours, groups, display) — not the classes. */
export function copyStructure(s: TimetableState, fromId: string, toId: string, next: () => string, now: number): TimetableState {
  const from = s.timetables.find(p => p.id === fromId);
  if (!from || fromId === toId) return s;
  return mapProfile(s, toId, p => {
    const periods = from.periods.map(pe => ({ ...pe, id: next() }));
    // Period links in the target no longer exist: keep each class's own times.
    const entries = p.entries.map(e => ({ ...e, periodId: null }));
    return touch({ ...p, days: [...from.days], firstDay: from.firstDay, mode: from.mode, dayStart: from.dayStart, dayEnd: from.dayEnd, periods, groups: [...new Set([...p.groups, ...from.groups])], display: { ...from.display }, entries }, now);
  });
}

/* ---------- periods ---------- */

export function validatePeriod(pe: Pick<TimetablePeriod, 'name' | 'start' | 'end'>): Partial<Record<'name' | 'start' | 'end', string>> {
  const errors: Partial<Record<'name' | 'start' | 'end', string>> = {};
  if (!pe.name.trim()) errors.name = 'اكتب اسم الفترة';
  if (!isTime(pe.start)) errors.start = 'وقت غير صالح';
  if (!isTime(pe.end)) errors.end = 'وقت غير صالح';
  else if (isTime(pe.start) && toMin(pe.end) <= toMin(pe.start)) errors.end = 'يجب أن ينتهي بعد البداية';
  return errors;
}

const sortPeriods = (ps: TimetablePeriod[]) => [...ps].sort((a, b) => toMin(a.start) - toMin(b.start));

/** A sensible next period: starts where the last one ended, same length (or 1 hour). */
export function suggestPeriod(p: TimetableProfile): { name: string; start: string; end: string } {
  const last = sortPeriods(p.periods).at(-1);
  const start = last ? toMin(last.end) : toMin(p.dayStart);
  const len = last ? durationMin(last) : 60;
  return { name: `الفترة ${p.periods.length + 1}`, start: fromMin(start), end: fromMin(Math.min(start + len, 23 * 60 + 59)) };
}

export const addPeriod = (s: TimetableState, id: string, pe: TimetablePeriod, now: number) => mapProfile(s, id, p => touch({ ...p, periods: [...p.periods, pe] }, now));

/** Editing a period also moves every class attached to it. */
export function updatePeriod(s: TimetableState, id: string, periodId: string, patch: Partial<Omit<TimetablePeriod, 'id'>>, now: number): TimetableState {
  return mapProfile(s, id, p => {
    const periods = p.periods.map(pe => (pe.id === periodId ? { ...pe, ...patch } : pe));
    const pe = periods.find(x => x.id === periodId);
    const entries = pe && (patch.start || patch.end) ? p.entries.map(e => (e.periodId === periodId ? { ...e, start: pe.start, end: pe.end } : e)) : p.entries;
    return touch({ ...p, periods, entries }, now);
  });
}

/** Reorders by moving a period up/down in the list (its times are unchanged). */
export function movePeriod(s: TimetableState, id: string, periodId: string, dir: -1 | 1, now: number): TimetableState {
  return mapProfile(s, id, p => {
    const i = p.periods.findIndex(pe => pe.id === periodId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= p.periods.length) return p;
    const periods = [...p.periods];
    [periods[i], periods[j]] = [periods[j], periods[i]];
    return touch({ ...p, periods }, now);
  });
}

/** Deleting a period keeps its classes (with their times); they just stop following it. */
export const deletePeriod = (s: TimetableState, id: string, periodId: string, now: number) =>
  mapProfile(s, id, p => touch({ ...p, periods: p.periods.filter(pe => pe.id !== periodId), entries: p.entries.map(e => (e.periodId === periodId ? { ...e, periodId: null } : e)) }, now));

/* ---------- entries ---------- */

export type EntryDraft = Omit<TimetableEntry, 'id'>;
export type EntryErrors = Partial<Record<'title' | 'day' | 'start' | 'end' | 'courseId', string>>;

/** A class needs a name (its own, or its course's) and a valid time range; everything else is optional. */
export function validateEntry(d: EntryDraft, courseIds: string[]): EntryErrors {
  const errors: EntryErrors = {};
  if (!d.title.trim() && !d.courseId) errors.title = d.kind === 'break' ? 'اكتب اسم الاستراحة' : 'اختر مادة أو اكتب اسم الحصة';
  if (!DAY_IDS.includes(d.day)) errors.day = 'اختر اليوم';
  if (!isTime(d.start)) errors.start = 'وقت غير صالح';
  if (!isTime(d.end)) errors.end = 'وقت غير صالح';
  else if (isTime(d.start) && toMin(d.end) <= toMin(d.start)) errors.end = 'يجب أن ينتهي بعد البداية';
  if (d.courseId && !courseIds.includes(d.courseId)) errors.courseId = 'المادة غير موجودة';
  return errors;
}

/** Remembers a new group name so it's offered next time (case/space-insensitive dedupe). */
export function withGroup(groups: string[], name: string | undefined): string[] {
  const g = name?.trim().slice(0, 60);
  if (!g || groups.some(x => x.trim().toLowerCase() === g.toLowerCase())) return groups;
  return [...groups, g];
}

export function addEntry(s: TimetableState, id: string, entry: TimetableEntry, now: number): TimetableState {
  return mapProfile(s, id, p => touch({ ...p, entries: [...p.entries, entry], groups: withGroup(p.groups, entry.group) }, now));
}
export function updateEntry(s: TimetableState, id: string, entryId: string, patch: Partial<EntryDraft>, now: number): TimetableState {
  return mapProfile(s, id, p => touch({ ...p, entries: p.entries.map(e => (e.id === entryId ? { ...e, ...patch } : e)), groups: withGroup(p.groups, patch.group) }, now));
}
export const deleteEntry = (s: TimetableState, id: string, entryId: string, now: number) => mapProfile(s, id, p => touch({ ...p, entries: p.entries.filter(e => e.id !== entryId) }, now));

export function duplicateEntry(s: TimetableState, id: string, entryId: string, newId: string, now: number, day?: DayId): TimetableState {
  return mapProfile(s, id, p => {
    const e = p.entries.find(x => x.id === entryId);
    return e ? touch({ ...p, entries: [...p.entries, { ...e, id: newId, ...(day ? { day } : {}) }] }, now) : p;
  });
}

/** Copies every class/break of one day onto other days (replacing nothing). */
export function duplicateDay(s: TimetableState, id: string, from: DayId, to: DayId[], next: () => string, now: number): TimetableState {
  return mapProfile(s, id, p => {
    const src = p.entries.filter(e => e.day === from);
    const copies = to.filter(d => d !== from).flatMap(day => src.map(e => ({ ...e, id: next(), day })));
    return copies.length ? touch({ ...p, entries: [...p.entries, ...copies] }, now) : p;
  });
}

/** Removes links to courses that no longer exist (the class keeps its own title). */
export function unlinkCourse(timetables: TimetableProfile[] | undefined, courseId: string, courseName: string): TimetableProfile[] | undefined {
  if (!timetables) return timetables;
  return timetables.map(p =>
    p.entries.some(e => e.courseId === courseId) ? { ...p, entries: p.entries.map(e => (e.courseId === courseId ? { ...e, courseId: null, title: e.title || courseName } : e)) } : p,
  );
}

/* ---------- reading ---------- */

export const entriesOnDay = (p: TimetableProfile, day: DayId) => p.entries.filter(e => e.day === day).sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));

export interface Conflict {
  day: DayId;
  a: TimetableEntry;
  b: TimetableEntry;
}

const overlap = (a: { start: string; end: string }, b: { start: string; end: string }) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

/** Overlapping classes (breaks never conflict). A warning only — saving is never blocked. */
export function findConflicts(p: TimetableProfile): Conflict[] {
  const out: Conflict[] = [];
  for (const day of p.days) {
    const list = entriesOnDay(p, day).filter(e => e.kind === 'class');
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlap(list[i], list[j])) out.push({ day, a: list[i], b: list[j] });
  }
  return out;
}

/** Classes that a draft (new or edited) would overlap. */
export const conflictsWith = (p: TimetableProfile, d: Pick<EntryDraft, 'day' | 'start' | 'end' | 'kind'>, ignoreId?: string) =>
  d.kind !== 'class' || !isTime(d.start) || !isTime(d.end) ? [] : p.entries.filter(e => e.id !== ignoreId && e.kind === 'class' && e.day === d.day && overlap(e, d));

/** Free time between the day's items (merged), at least `min` minutes — never stored as entries. */
export function freeGaps(entries: Array<{ start: string; end: string }>, min = 15): Array<{ start: string; end: string; minutes: number }> {
  const sorted = [...entries].sort((a, b) => toMin(a.start) - toMin(b.start));
  const gaps: Array<{ start: string; end: string; minutes: number }> = [];
  let cursor = -1;
  for (const e of sorted) {
    const s = toMin(e.start);
    if (cursor >= 0 && s - cursor >= min) gaps.push({ start: fromMin(cursor), end: e.start, minutes: s - cursor });
    cursor = Math.max(cursor, toMin(e.end));
  }
  return gaps;
}

/** The grid's visible hours: the profile's range, stretched to fit any class outside it. */
export function visibleRange(p: TimetableProfile): { start: number; end: number } {
  const times = p.entries.filter(e => p.days.includes(e.day)).flatMap(e => [toMin(e.start), toMin(e.end)]);
  const periodTimes = p.periods.flatMap(pe => [toMin(pe.start), toMin(pe.end)]);
  const start = Math.min(toMin(p.dayStart), ...times, ...periodTimes);
  const end = Math.max(toMin(p.dayEnd), ...times, ...periodTimes);
  return { start: Math.floor(start / 60) * 60, end: Math.min(24 * 60, Math.ceil(end / 60) * 60) };
}

/* ---------- import of the built-in university timetable ---------- */

const BUILTIN_DAY: Record<string, DayId> = { Friday: 'fri', Saturday: 'sat', Sunday: 'sun', Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed', Thursday: 'thu' };

/**
 * Turns the university table that ships with the app into an editable, period-based profile
 * for one group. Nothing is guessed: titles, instructors and rooms are copied as written, and
 * the "(1)/(2)" alternate-week tags are kept and explained in the notes.
 */
export function importUniversityTimetable(input: { id: string; group: number; now: number; next: () => string }): TimetableProfile {
  const { group, now, next } = input;
  const times = new Map<string, { start: string; end: string }>();
  for (const rows of Object.values(TIMETABLE)) for (const row of rows ?? []) {
    const r = parseTimeRange(row.time);
    if (r) times.set(row.time, { start: fromMin(r.start), end: fromMin(r.end) });
  }
  const periods: TimetablePeriod[] = [...times.values()].sort((a, b) => toMin(a.start) - toMin(b.start)).map((t, i) => ({ id: next(), name: `الفترة ${i + 1}`, start: t.start, end: t.end }));
  const periodAt = (start: string) => periods.find(pe => pe.start === start)?.id ?? null;
  const entries: TimetableEntry[] = [];
  const days = new Set<DayId>();
  for (const [dayName, rows] of Object.entries(TIMETABLE)) {
    const day = BUILTIN_DAY[dayName];
    if (!day) continue;
    days.add(day);
    for (const row of rows ?? []) {
      const r = parseTimeRange(row.time);
      if (!r) continue;
      let first = 1;
      for (const cell of row.cells) {
        const last = first + cell.span - 1;
        const covers = group >= first && group <= last;
        first += cell.span;
        if (!covers) continue;
        for (const subject of cell.subjects) {
          const { instructor, room } = splitMeta(subject.meta);
          const tag = /^\((1|2|1\s*&\s*2)\)/.exec(subject.title.trim())?.[1];
          entries.push({
            id: next(),
            kind: 'class',
            day,
            start: fromMin(r.start),
            end: fromMin(r.end),
            title: subject.title.trim().slice(0, 120),
            courseId: null,
            type: null,
            group: `المجموعة ${group}`,
            instructor: instructor.slice(0, 120),
            room: room.slice(0, 80),
            ...(tag === '1' || tag === '2' ? { notes: `بالتناوب: تُعقد في أسبوع ${tag} فقط` } : {}),
            color: null,
            periodId: periodAt(fromMin(r.start)),
          });
        }
      }
    }
  }
  const p = newProfile({ id: input.id, name: `جدول الجامعة — المجموعة ${group}`, now, days: [...days], firstDay: 'sat', mode: 'periods' });
  return { ...p, dayStart: periods[0]?.start ?? '08:00', dayEnd: periods.at(-1)?.end ?? '18:00', periods, groups: [`المجموعة ${group}`], entries };
}

/* ---------- normalisation of untrusted data ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const COLORS = new Set<string>(ENTRY_COLORS);
const TYPES = new Set<string>(CLASS_TYPES.map(t => t.id));

/** Coerces stored/imported timetables; drops entries with impossible times instead of guessing. */
export function normalizeTimetables(raw: unknown, rawActive: unknown, courseIds: string[]): { timetables?: TimetableProfile[]; activeTimetableId?: string | null } {
  if (!Array.isArray(raw)) return {};
  const seen = new Set<string>();
  const timetables: TimetableProfile[] = [];
  for (const r of raw.slice(0, 20)) {
    if (!isObj(r)) continue;
    const id = str(r.id, 64);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const days = Array.isArray(r.days) ? DAY_IDS.filter(d => (r.days as unknown[]).includes(d)) : [];
    const periods: TimetablePeriod[] = (Array.isArray(r.periods) ? r.periods.slice(0, 40) : [])
      .filter(isObj)
      .map(pe => ({ id: str(pe.id, 64), name: str(pe.name, 60), start: str(pe.start, 5), end: str(pe.end, 5) }))
      .filter(pe => pe.id && isTime(pe.start) && isTime(pe.end) && toMin(pe.end) > toMin(pe.start));
    const periodIds = new Set(periods.map(pe => pe.id));
    const entries: TimetableEntry[] = (Array.isArray(r.entries) ? r.entries.slice(0, 600) : []).filter(isObj).flatMap((e): TimetableEntry[] => {
      const start = str(e.start, 5);
      const end = str(e.end, 5);
      const day = e.day as DayId;
      if (!str(e.id, 64) || !DAY_IDS.includes(day) || !isTime(start) || !isTime(end) || toMin(end) <= toMin(start)) return [];
      const courseId = typeof e.courseId === 'string' && courseIds.includes(e.courseId) ? e.courseId : null;
      return [
        {
          id: str(e.id, 64),
          kind: e.kind === 'break' ? 'break' : 'class',
          day,
          start,
          end,
          title: str(e.title, 120),
          courseId,
          type: typeof e.type === 'string' && TYPES.has(e.type) ? (e.type as ClassType) : null,
          group: str(e.group, 60),
          instructor: str(e.instructor, 120),
          room: str(e.room, 80),
          notes: str(e.notes, 1000),
          color: typeof e.color === 'string' && COLORS.has(e.color) ? (e.color as EntryColor) : null,
          periodId: typeof e.periodId === 'string' && periodIds.has(e.periodId) ? e.periodId : null,
        },
      ];
    });
    const disp = isObj(r.display) ? r.display : {};
    const safeDays = days.length ? days : WEEK_PRESETS[0].days;
    const firstDay = DAY_IDS.includes(r.firstDay as DayId) && safeDays.includes(r.firstDay as DayId) ? (r.firstDay as DayId) : safeDays[0];
    const dayStart = isTime(r.dayStart) ? r.dayStart : '08:00';
    const dayEnd = isTime(r.dayEnd) && toMin(r.dayEnd as string) > toMin(dayStart) ? (r.dayEnd as string) : '18:00';
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
    timetables.push({
      id,
      name: str(r.name, 80) || 'جدولي',
      ...(str(r.description, 300) ? { description: str(r.description, 300) } : {}),
      ...(r.archived === true ? { archived: true } : {}),
      days: safeDays,
      firstDay,
      mode: r.mode === 'periods' ? 'periods' : 'free',
      dayStart,
      dayEnd,
      periods,
      groups: (Array.isArray(r.groups) ? r.groups : []).filter((g): g is string => typeof g === 'string' && !!g.trim()).slice(0, 60).map(g => g.slice(0, 60)),
      display: {
        density: disp.density === 'compact' ? 'compact' : 'detailed',
        showRoom: disp.showRoom !== false,
        showInstructor: disp.showInstructor !== false,
        showGroup: disp.showGroup !== false,
      },
      entries,
      createdAt: num(r.createdAt),
      updatedAt: num(r.updatedAt),
    });
  }
  const active = typeof rawActive === 'string' && timetables.some(p => p.id === rawActive && !p.archived) ? rawActive : (timetables.find(p => !p.archived)?.id ?? null);
  return { timetables, activeTimetableId: active };
}

/** The profile shown by default: the active one if it's live, else the first live one. */
export function activeProfile(s: Partial<TimetableState>): TimetableProfile | null {
  const list = s.timetables ?? [];
  return list.find(p => p.id === s.activeTimetableId && !p.archived) ?? list.find(p => !p.archived) ?? null;
}

export type StructureDraft = Pick<TimetableProfile, 'name' | 'description' | 'days' | 'firstDay' | 'mode' | 'dayStart' | 'dayEnd' | 'periods' | 'display'>;

/**
 * Applies the settings dialog in one step. Classes attached to a period follow its new times;
 * classes whose period was removed keep their times and become free-standing.
 */
export function applyStructure(s: TimetableState, id: string, draft: StructureDraft, now: number): TimetableState {
  return mapProfile(s, id, p => {
    const byId = new Map(draft.periods.map(pe => [pe.id, pe]));
    const entries = p.entries.map(e => {
      if (!e.periodId) return e;
      const pe = byId.get(e.periodId);
      return pe ? { ...e, start: pe.start, end: pe.end } : { ...e, periodId: null };
    });
    const days = DAY_IDS.filter(d => draft.days.includes(d));
    return touch(
      {
        ...p,
        name: draft.name.trim().slice(0, 80) || p.name,
        description: draft.description?.trim().slice(0, 300) || undefined,
        days: days.length ? days : p.days,
        firstDay: days.includes(draft.firstDay) ? draft.firstDay : (days[0] ?? p.firstDay),
        mode: draft.mode,
        dayStart: draft.dayStart,
        dayEnd: draft.dayEnd,
        periods: draft.periods.map(pe => ({ ...pe })),
        display: { ...draft.display },
        entries,
      },
      now,
    );
  });
}

/**
 * Side-by-side layout for overlapping items in a day column: each item gets a lane, and every
 * item in an overlapping cluster knows how many lanes that cluster needs.
 */
export function layoutDay(entries: Array<{ id: string; start: string; end: string }>): Map<string, { lane: number; lanes: number }> {
  const sorted = [...entries].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end));
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: string[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const close = () => {
    for (const id of cluster) out.set(id, { lane: out.get(id)!.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const e of sorted) {
    const s = toMin(e.start);
    if (cluster.length && s >= clusterEnd) close();
    let lane = laneEnds.findIndex(end => end <= s);
    if (lane < 0) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = toMin(e.end);
    out.set(e.id, { lane, lanes: 0 });
    cluster.push(e.id);
    clusterEnd = Math.max(clusterEnd, toMin(e.end));
  }
  if (cluster.length) close();
  return out;
}
