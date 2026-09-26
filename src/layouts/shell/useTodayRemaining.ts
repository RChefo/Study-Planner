import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useMinuteNow } from '@/features/insights/hooks';
import { dueInfo } from '@/features/insights/selectors';
import { useTodayClasses } from '@/features/dashboard/useToday';
import { atMinutes } from '@/features/timetable/classTimes';

/**
 * What is still ahead today, from real data only: university classes that haven't ended
 * (for the saved group) plus open commitments due today or overdue.
 */
export function useTodayRemaining(): { total: number; label: string } {
  const now = useMinuteNow();
  const { classes } = useTodayClasses(now);
  const commitments = usePlannerStore(s => s.data.commitments);
  return useMemo(() => {
    const classesLeft = classes.filter(c => c.range && atMinutes(now, c.range.end) > now).length;
    const due = commitments.filter(c => !c.done && ['today', 'overdue'].includes(dueInfo(c.dueDate, now).state)).length;
    const parts = [classesLeft ? `${classesLeft} محاضرة جامعية` : '', due ? `${due} التزام مستحق` : ''].filter(Boolean);
    return { total: classesLeft + due, label: parts.length ? `متبقٍّ اليوم: ${parts.join(' و')}` : 'لا شيء متبقٍّ اليوم' };
  }, [classes, commitments, now]);
}
