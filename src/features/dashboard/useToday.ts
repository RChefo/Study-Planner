import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { classesFor, getWeekInfo, savedGroup, weekdayOf, type UniClass } from '@/features/timetable/schedule';
import { activeProfile, dayOf, entriesOnDay, toMin } from '@/features/timetable/builder';
import { buildTodayTimeline, type TimelineItem } from './timeline';

export interface TodayClasses {
  /** The student's saved group ('' = not chosen yet; 'custom' = their own timetable). */
  group: string;
  /** Today is a class day in the university timetable. */
  classDay: boolean;
  /** Today's classes for the saved group (empty when no group is chosen). */
  classes: UniClass[];
}

/**
 * Today's classes: from the student's active timetable when they have built or imported one,
 * otherwise from the built-in university schedule for the saved group. Re-evaluated when `now`
 * changes day or the timetable changes.
 */
export function useTodayClasses(now: number): TodayClasses {
  const dayStamp = new Date(now).toDateString();
  const timetables = usePlannerStore(s => s.data.timetables);
  const activeId = usePlannerStore(s => s.data.activeTimetableId);
  const courses = usePlannerStore(s => s.data.courses);
  return useMemo(() => {
    const profile = activeProfile({ timetables, activeTimetableId: activeId });
    if (profile) {
      const day = dayOf(now);
      if (!profile.days.includes(day)) return { group: 'custom', classDay: false, classes: [] };
      const classes = entriesOnDay(profile, day)
        .filter(e => e.kind === 'class')
        .map((e, i): UniClass => ({
          key: e.id,
          period: i + 1,
          time: `${e.start} - ${e.end}`,
          range: { start: toMin(e.start), end: toMin(e.end) },
          title: e.title.trim() || courses.find(c => c.id === e.courseId)?.name || 'حصة',
          instructor: e.instructor ?? '',
          room: e.room ?? '',
          label: e.group ?? '',
          extra: [],
        }));
      return { group: 'custom', classDay: true, classes };
    }
    const group = savedGroup();
    const day = weekdayOf(now);
    if (!day) return { group, classDay: false, classes: [] };
    return { group, classDay: true, classes: group ? classesFor(day, group, getWeekInfo(new Date(now)).section) : [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the calendar day (not the minute) matters
  }, [dayStamp, timetables, activeId, courses]);
}

/** Today's timeline items (logged rounds, the running round, classes). */
export function useTodayTimeline(now: number, classes: UniClass[]): TimelineItem[] {
  const log = usePlannerStore(s => s.data.studyLog);
  const active = useTimerStore(s => s.timer.active);
  const mode = useTimerStore(s => s.timer.mode);
  const startedAt = useTimerStore(s => s.timer.startedAt);
  const subject = useTimerStore(s => s.timer.subject);
  const topic = useTimerStore(s => s.timer.topic);
  return useMemo(
    () => buildTodayTimeline({ log, classes, timer: { active, mode, startedAt, subject, topic }, now }),
    [log, classes, active, mode, startedAt, subject, topic, now],
  );
}
