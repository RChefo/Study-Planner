import type { Commitment, Course, Lecture, PlannerData, PlannerPreferences, StudyLogEntry, StudySession, StudySessionStatus } from '@/types';
import { parseOnboarding } from '@/features/onboarding/tourModel';
import { stripUnsafeAttachments } from './attachments';

/**
 * Defensive normalization for planner data coming from *any* untrusted place (IndexedDB,
 * localStorage, an imported Excel file, the cloud copy): wrong types are coerced or dropped,
 * strings are bounded, and unsafe attachments are removed — so bad data can't crash the UI
 * or smuggle active content.
 */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v).slice(0, max) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const arr = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max).filter(isObj) : []);
const idOf = (v: unknown, fallback: string) => str(v, 64) || fallback;

function lecture(raw: Record<string, unknown>): Lecture {
  const out: Lecture = { name: str(raw.name, 300), done: raw.done === true };
  if (typeof raw.pdf === 'string') out.pdf = raw.pdf;
  if (typeof raw.pdfName === 'string') out.pdfName = str(raw.pdfName, 255);
  return out;
}

function course(raw: Record<string, unknown>, i: number): Course {
  return { id: idOf(raw.id, `course-${i}`), name: str(raw.name, 200, 'مادة'), topics: arr(raw.topics, 1000).map(lecture) };
}

function commitment(raw: Record<string, unknown>, i: number): Commitment {
  const due = str(raw.dueDate, 10);
  const out: Commitment = {
    id: idOf(raw.id, `commitment-${i}`),
    name: str(raw.name, 300),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '',
    description: str(raw.description, 5000),
  };
  if (typeof raw.done === 'boolean') out.done = raw.done;
  if (typeof raw.pdf === 'string') out.pdf = raw.pdf;
  if (typeof raw.pdfName === 'string') out.pdfName = str(raw.pdfName, 255);
  return out;
}

function logEntry(raw: Record<string, unknown>, i: number): StudyLogEntry {
  const startedAt = num(raw.startedAt, 0, 8.64e15, 0);
  return {
    id: idOf(raw.id, `log-${i}`),
    subject: str(raw.subject, 200),
    topic: str(raw.topic, 300),
    startedAt,
    endedAt: num(raw.endedAt, 0, 8.64e15, startedAt),
    duration: num(raw.duration, 0, 1440, 0),
    completed: raw.completed === true,
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId.slice(0, 64) : null,
  };
}

const STATUSES: StudySessionStatus[] = ['planned', 'inprogress', 'done', 'skipped', 'moved'];
function session(raw: Record<string, unknown>, i: number): StudySession {
  return {
    id: idOf(raw.id, `session-${i}`),
    course: str(raw.course, 64),
    subject: typeof raw.subject === 'string' ? str(raw.subject, 200) : undefined,
    topic: str(raw.topic, 300),
    date: str(raw.date, 20),
    time: str(raw.time, 10),
    duration: num(raw.duration, 0, 1440, 0),
    priority: str(raw.priority, 20),
    study: str(raw.study, 2000),
    prev: str(raw.prev, 300),
    next: str(raw.next, 300),
    status: STATUSES.includes(raw.status as StudySessionStatus) ? (raw.status as StudySessionStatus) : 'planned',
  };
}

function preferences(raw: unknown): PlannerPreferences | undefined {
  if (!isObj(raw)) return undefined;
  const prefs: PlannerPreferences = raw.dailyGoalMinutes === undefined ? {} : { dailyGoalMinutes: Math.round(num(raw.dailyGoalMinutes, 0, 1440, 120)) };
  const onboarding = parseOnboarding(raw.onboarding);
  if (onboarding) prefs.onboarding = onboarding;
  return prefs;
}

/** Fills in missing collections, coerces types and strips unsafe attachments. */
export function normalizePlannerData(raw: unknown, keepTimetable = true): PlannerData {
  const r = isObj(raw) ? raw : {};
  const timetable = keepTimetable && isObj(r.timetable) ? { name: str(r.timetable.name, 255), type: str(r.timetable.type, 100) } : null;
  const data: PlannerData = {
    courses: arr(r.courses, 500).map(course),
    sessions: arr(r.sessions, 5000).map(session),
    commitments: arr(r.commitments, 5000).map(commitment),
    studyLog: arr(r.studyLog, 100_000).map(logEntry),
    timetable,
  };
  const prefs = preferences(r.preferences);
  if (prefs) data.preferences = prefs;
  return stripUnsafeAttachments(data).data;
}

export function hasPlannerContent(d: PlannerData): boolean {
  return !!(d.courses.length || d.sessions.length || d.commitments.length || d.studyLog.length);
}

/** Copy for localStorage: attachments stripped so it fits the ~5 MB quota. */
export function withoutAttachments(d: PlannerData): PlannerData {
  return {
    ...d,
    courses: d.courses.map(c => ({ ...c, topics: (c.topics ?? []).map(({ pdf, ...t }) => t) })),
    commitments: d.commitments.map(({ pdf, ...c }) => c),
    timetable: d.timetable ? { name: d.timetable.name, type: d.timetable.type } : null,
  };
}
