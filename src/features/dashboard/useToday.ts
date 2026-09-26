import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { classesFor, getWeekInfo, savedGroup, weekdayOf, type UniClass } from '@/features/timetable/schedule';
import { buildTodayTimeline, type TimelineItem } from './timeline';

export interface TodayClasses {
  /** The student's saved group ('' = not chosen yet). */
  group: string;
  /** Today is a class day in the university timetable. */
  classDay: boolean;
  /** Today's classes for the saved group (empty when no group is chosen). */
  classes: UniClass[];
}

/** Today's university classes for the saved group. Re-evaluated when `now` changes day. */
export function useTodayClasses(now: number): TodayClasses {
  const dayStamp = new Date(now).toDateString();
  return useMemo(() => {
    const group = savedGroup();
    const day = weekdayOf(now);
    if (!day) return { group, classDay: false, classes: [] };
    return { group, classDay: true, classes: group ? classesFor(day, group, getWeekInfo(new Date(now)).section) : [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the calendar day matters
  }, [dayStamp]);
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
