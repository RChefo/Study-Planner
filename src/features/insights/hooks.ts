import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { courseInfo, type CourseInfo } from './selectors';

/** Per-course progress, memoized on data/timer identity (not on every timer tick). */
export function useCourseInfos(): CourseInfo[] {
  const courses = usePlannerStore(s => s.data.courses);
  const log = usePlannerStore(s => s.data.studyLog);
  const active = useTimerStore(s => s.timer.active);
  const mode = useTimerStore(s => s.timer.mode);
  const subject = useTimerStore(s => s.timer.subject);
  const topic = useTimerStore(s => s.timer.topic);
  return useMemo(() => {
    const running = { active, mode, subject, topic } as Parameters<typeof courseInfo>[2];
    return courses.map(c => courseInfo(c, log, running));
  }, [courses, log, active, mode, subject, topic]);
}

/**
 * A clock that re-renders once a minute (for "today" boundaries and relative dates);
 * the running timer's own 500 ms tick is used where seconds matter.
 */
export function useMinuteNow(): number {
  return useTimerStore(s => Math.floor(s.now / 60000)) * 60000;
}
