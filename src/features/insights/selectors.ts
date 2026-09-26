/**
 * Pure, testable derivations over real planner data for the dashboard, courses, timer and
 * statistics views. No store or DOM imports — pass `now` explicitly.
 *
 * Study-log entries reference courses by *name* (subject) and lectures by *topic*, which is
 * how the timer has always recorded them.
 */
import type { Commitment, Course, PlannerData, StudyLogEntry, TimerState } from '../../types/index.ts';

export const DAY_MS = 86_400_000;
export const DEFAULT_DAILY_GOAL = 120;

/** Local calendar day key YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Adds whole calendar days (DST-safe). */
function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function entriesOn(log: StudyLogEntry[], key: string): StudyLogEntry[] {
  return log.filter(l => dayKey(l.startedAt) === key).sort((a, b) => a.startedAt - b.startedAt);
}

export const sumMinutes = (log: StudyLogEntry[]) => log.reduce((n, l) => n + (Number(l.duration) || 0), 0);

export interface DayTotal {
  key: string;
  date: number;
  minutes: number;
  sessions: number;
}

/** Totals for the last `days` calendar days, oldest first (today last). */
export function dailyTotals(log: StudyLogEntry[], now: number, days: number): DayTotal[] {
  const byDay = new Map<string, { minutes: number; sessions: number }>();
  for (const l of log) {
    const k = dayKey(l.startedAt);
    const agg = byDay.get(k) ?? { minutes: 0, sessions: 0 };
    agg.minutes += Number(l.duration) || 0;
    agg.sessions += 1;
    byDay.set(k, agg);
  }
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    const key = dayKey(date);
    return { key, date, ...(byDay.get(key) ?? { minutes: 0, sessions: 0 }) };
  });
}

/**
 * Current streak: consecutive days with study ending today — or ending yesterday if
 * nothing has been logged yet today (the streak isn't broken until the day is over).
 */
export function streaks(log: StudyLogEntry[], now: number): { current: number; longest: number } {
  const days = new Set(log.filter(l => (Number(l.duration) || 0) > 0).map(l => dayKey(l.startedAt)));
  if (!days.size) return { current: 0, longest: 0 };
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T12:00:00`);
    const next = new Date(`${sorted[i]}T12:00:00`);
    run = Math.round((next.getTime() - prev.getTime()) / DAY_MS) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest: Math.max(longest, current) };
}

export type LectureStatus = 'done' | 'in-progress' | 'not-started';

export interface LectureInfo {
  index: number;
  name: string;
  status: LectureStatus;
  minutes: number;
  lastStudiedAt: number | null;
  hasPdf: boolean;
}

export interface CourseInfo {
  course: Course;
  total: number;
  done: number;
  remaining: number;
  percent: number;
  minutes: number;
  lastStudiedAt: number | null;
  nextLecture: LectureInfo | null;
  lectures: LectureInfo[];
}

const timerOn = (timer: TimerState | null | undefined, subject: string, topic: string) =>
  !!timer?.active && timer.mode === 'focus' && timer.subject === subject && timer.topic === topic;

export function courseInfo(course: Course, log: StudyLogEntry[], timer?: TimerState | null): CourseInfo {
  const courseLog = log.filter(l => l.subject === course.name);
  const lectures: LectureInfo[] = (course.topics ?? []).map((t, index) => {
    const entries = courseLog.filter(l => l.topic === t.name);
    const status: LectureStatus = t.done ? 'done' : entries.length || timerOn(timer, course.name, t.name) ? 'in-progress' : 'not-started';
    return {
      index,
      name: t.name,
      status,
      minutes: sumMinutes(entries),
      lastStudiedAt: entries.length ? Math.max(...entries.map(e => e.startedAt)) : null,
      hasPdf: !!t.pdf,
    };
  });
  const done = lectures.filter(l => l.status === 'done').length;
  const total = lectures.length;
  return {
    course,
    total,
    done,
    remaining: total - done,
    percent: total ? Math.round((done / total) * 100) : 0,
    minutes: sumMinutes(courseLog),
    lastStudiedAt: courseLog.length ? Math.max(...courseLog.map(l => l.startedAt)) : null,
    // Prefer a lecture already in progress, else the first one not started.
    nextLecture: lectures.find(l => l.status === 'in-progress') ?? lectures.find(l => l.status === 'not-started') ?? null,
    lectures,
  };
}

/** Next lectures to study: one per course, most recently active courses first. */
export function nextUp(data: PlannerData, timer: TimerState | null, limit: number): Array<{ info: CourseInfo; lecture: LectureInfo }> {
  return data.courses
    .map((c, order) => ({ info: courseInfo(c, data.studyLog, timer), order }))
    .filter(x => x.info.nextLecture)
    .sort((a, b) => (b.info.lastStudiedAt ?? -1) - (a.info.lastStudiedAt ?? -1) || a.order - b.order)
    .slice(0, limit)
    .map(x => ({ info: x.info, lecture: x.info.nextLecture! }));
}

export type DueState = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'none';

export interface DueInfo {
  state: DueState;
  /** Whole days until due (negative when overdue); null when there is no due date. */
  days: number | null;
}

export function dueInfo(dueDate: string, now: number): DueInfo {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { state: 'none', days: null };
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const days = Math.round((due - startOfDay(now)) / DAY_MS);
  const state: DueState = days < 0 ? 'overdue' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : days <= 7 ? 'soon' : 'later';
  return { state, days };
}

/** Open commitments ordered by urgency (overdue → soonest → undated). */
export function openCommitments(commitments: Commitment[], now: number): Array<{ commitment: Commitment; due: DueInfo }> {
  return commitments
    .filter(c => !c.done)
    .map(commitment => ({ commitment, due: dueInfo(commitment.dueDate, now) }))
    .sort((a, b) => (a.due.days ?? Number.POSITIVE_INFINITY) - (b.due.days ?? Number.POSITIVE_INFINITY));
}

export interface StudySummary {
  totalMinutes: number;
  sessions: number;
  averageMinutes: number;
  completionRate: number;
  lecturesDone: number;
  lecturesTotal: number;
}

export function summary(data: PlannerData): StudySummary {
  const log = data.studyLog;
  const totalMinutes = sumMinutes(log);
  const lecturesTotal = data.courses.reduce((n, c) => n + (c.topics?.length ?? 0), 0);
  const lecturesDone = data.courses.reduce((n, c) => n + (c.topics?.filter(t => t.done).length ?? 0), 0);
  return {
    totalMinutes,
    sessions: log.length,
    averageMinutes: log.length ? Math.round(totalMinutes / log.length) : 0,
    completionRate: log.length ? Math.round((log.filter(l => l.completed).length / log.length) * 100) : 0,
    lecturesDone,
    lecturesTotal,
  };
}

/** Minutes per subject (course name), largest first. */
export function minutesBySubject(log: StudyLogEntry[], since?: number): Array<{ subject: string; minutes: number }> {
  const totals = new Map<string, number>();
  for (const l of log) {
    if (since !== undefined && l.startedAt < since) continue;
    const key = l.subject || '—';
    totals.set(key, (totals.get(key) ?? 0) + (Number(l.duration) || 0));
  }
  return [...totals.entries()].map(([subject, minutes]) => ({ subject, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export function dailyGoal(data: PlannerData): number {
  const goal = data.preferences?.dailyGoalMinutes;
  return typeof goal === 'number' && goal > 0 ? goal : DEFAULT_DAILY_GOAL;
}

export { addDays, startOfDay };
