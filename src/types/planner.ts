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

export interface PlannerPreferences {
  /** Daily study goal shown on the dashboard. */
  dailyGoalMinutes?: number;
}

export interface PlannerData {
  courses: Course[];
  sessions: StudySession[];
  commitments: Commitment[];
  studyLog: StudyLogEntry[];
  timetable: LegacyTimetableRef | null;
  preferences?: PlannerPreferences;
}

export const emptyPlannerData = (): PlannerData => ({
  courses: [],
  sessions: [],
  commitments: [],
  studyLog: [],
  timetable: null,
});
