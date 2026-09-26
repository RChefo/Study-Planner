/**
 * Planner data model. Field names match what the original app stored in
 * IndexedDB, localStorage and the `plannerData` MongoDB collection, so existing
 * user data loads without migration.
 */

/** A PDF/image attached inline as a `data:` URL (uploaded to GridFS when syncing). */
export type DataUrl = string;

export interface Lecture {
  name: string;
  done: boolean;
  pdf?: DataUrl;
  pdfName?: string;
}

export interface Course {
  id: string;
  name: string;
  topics: Lecture[];
}

export type CommitmentId = string;

export interface Commitment {
  id: CommitmentId;
  name: string;
  dueDate: string;
  description: string;
  done?: boolean;
  pdf?: DataUrl;
  pdfName?: string;
}

export interface StudyLogEntry {
  id: string;
  subject: string;
  topic: string;
  startedAt: number;
  endedAt: number;
  /** Minutes. */
  duration: number;
  completed: boolean;
  sessionId: string | null;
}

export type StudySessionStatus = 'planned' | 'inprogress' | 'done' | 'skipped' | 'moved';

/**
 * Scheduled study sessions from an earlier version of the planner. The UI for
 * them was already unreachable in the original page, but the data is still
 * stored, synced and included in Excel backups, so it is preserved as-is.
 */
export interface StudySession {
  id: string;
  course: string;
  subject?: string;
  topic: string;
  date: string;
  time: string;
  duration: number;
  priority: string;
  study: string;
  prev: string;
  next: string;
  status: StudySessionStatus;
}

/** Legacy uploaded-timetable reference; always null in the current app. */
export interface LegacyTimetableRef {
  name: string;
  type: string;
  data?: DataUrl;
}

export type OnboardingStatus = 'completed' | 'skipped';

export interface PlannerPreferences {
  /** Daily study goal shown on the dashboard. */
  dailyGoalMinutes?: number;
  /** First-run product tour: finished or dismissed (either stops it opening automatically). */
  onboarding?: { status: OnboardingStatus; at: number };
}

/* ---------- Student-built timetables ---------- */

/** Weekday ids (not tied to any week start). */
export type DayId = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type TimeMode = 'free' | 'periods';
export type ClassType = 'lecture' | 'tutorial' | 'lab' | 'seminar' | 'exam' | 'other';
export type EntryColor = 'forest' | 'gold' | 'clay' | 'sky' | 'plum' | 'slate';

/** A named slot of the student's own day structure ("المحاضرة الأولى 08:00–09:30"). */
export interface TimetablePeriod {
  id: string;
  name: string;
  /** "HH:MM", 24-hour. */
  start: string;
  end: string;
}

/** One weekly recurring item: an academic class, or a named break (lunch, prayer, commute). */
export interface TimetableEntry {
  id: string;
  kind: 'class' | 'break';
  day: DayId;
  start: string;
  end: string;
  title: string;
  /** Links to an existing course instead of duplicating it (null = standalone). */
  courseId?: string | null;
  type?: ClassType | null;
  group?: string;
  instructor?: string;
  room?: string;
  notes?: string;
  color?: EntryColor | null;
  /** Period-mode entries keep their period so editing the period moves them too. */
  periodId?: string | null;
}

export interface TimetableDisplay {
  density: 'compact' | 'detailed';
  showRoom: boolean;
  showInstructor: boolean;
  showGroup: boolean;
}

export interface TimetableProfile {
  id: string;
  name: string;
  description?: string;
  archived?: boolean;
  days: DayId[];
  firstDay: DayId;
  mode: TimeMode;
  /** Visible range of the week grid. */
  dayStart: string;
  dayEnd: string;
  periods: TimetablePeriod[];
  /** The student's own group names, offered when adding entries. */
  groups: string[];
  display: TimetableDisplay;
  entries: TimetableEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface PlannerData {
  courses: Course[];
  sessions: StudySession[];
  commitments: Commitment[];
  studyLog: StudyLogEntry[];
  timetable: LegacyTimetableRef | null;
  preferences?: PlannerPreferences;
  /** Timetables the student built (absent in older data = none yet). */
  timetables?: TimetableProfile[];
  activeTimetableId?: string | null;
}

export const emptyPlannerData = (): PlannerData => ({
  courses: [],
  sessions: [],
  commitments: [],
  studyLog: [],
  timetable: null,
});
