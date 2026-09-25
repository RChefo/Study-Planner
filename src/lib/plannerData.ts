import type { PlannerData } from '@/types';

type LoosePlannerData = Partial<{ [K in keyof PlannerData]: PlannerData[K] | null | undefined }>;

/** Fills in missing collections, like the original `db.x = db.x || []` guards. */
export function normalizePlannerData(raw: LoosePlannerData | null | undefined, keepTimetable = true): PlannerData {
  return {
    courses: raw?.courses ?? [],
    sessions: raw?.sessions ?? [],
    commitments: raw?.commitments ?? [],
    studyLog: raw?.studyLog ?? [],
    timetable: keepTimetable ? (raw?.timetable ?? null) : null,
  };
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
