import { useCallback, useMemo } from 'react';
import type { Course, TimetableEntry, TimetableProfile } from '@/types';
import { uid } from '@/lib/id';
import { usePlannerStore } from '@/stores/plannerStore';
import { activeProfile, type TimetableState } from '../builder';

const NONE: TimetableProfile[] = [];

/** Ids for profiles, periods and entries (extra entropy: batch copies create several per ms). */
export const newId = () => `${uid()}${Math.random().toString(36).slice(2, 6)}`;

/** The student's timetables, the one on screen, and a way to apply builder operations. */
export function useTimetable() {
  const timetables = usePlannerStore(s => s.data.timetables) ?? NONE;
  const activeId = usePlannerStore(s => s.data.activeTimetableId ?? null);
  const courses = usePlannerStore(s => s.data.courses);
  const update = usePlannerStore(s => s.updateTimetables);
  const profile = useMemo(() => activeProfile({ timetables, activeTimetableId: activeId }), [timetables, activeId]);
  const run = useCallback((fn: (s: TimetableState) => TimetableState) => update(fn), [update]);
  return { timetables, profile, courses, run };
}

/** The name a class shows: its own title, else its linked course's name. */
export const entryTitle = (e: TimetableEntry, courses: Course[]) => e.title.trim() || courses.find(c => c.id === e.courseId)?.name || 'حصة';
