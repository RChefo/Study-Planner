import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { formatLongDay, formatMinutes, greeting, lecturesPhrase, tasksPhrase } from '@/lib/format';
import { useMinuteNow } from '@/features/insights/hooks';
import { dailyGoal, dayKey, dueInfo, entriesOn, sumMinutes } from '@/features/insights/selectors';
import { NowPanel } from '@/features/dashboard/NowPanel';
import { TodayTimeline } from '@/features/dashboard/TodayTimeline';
import { Deadlines, TodayProgress, UpNext } from '@/features/dashboard/Aside';
import { useTodayClasses, useTodayTimeline } from '@/features/dashboard/useToday';
import { atMinutes } from '@/features/timetable/classTimes';

/**
 * Today: NOW (what to study, or the round in progress) → the day's timeline → what's next
 * and what's due → progress. Built entirely from the student's real data.
 */
export function DashboardPage() {
  const now = useMinuteNow();
  const name = useAuthStore(s => s.user?.name?.split(' ')[0]);
  const data = usePlannerStore(s => s.data);
  const { group, classDay, classes } = useTodayClasses(now);
  const items = useTodayTimeline(now, classes);

  const classNow = classes.find(c => c.range && atMinutes(now, c.range.start) <= now && now < atMinutes(now, c.range.end)) ?? null;
  const dueToday = useMemo(() => data.commitments.filter(c => !c.done && dueInfo(c.dueDate, now).state === 'today'), [data.commitments, now]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (classDay && group) {
      const left = classes.filter(c => c.range && atMinutes(now, c.range.end) > now).length;
      parts.push(left ? `بقي لك ${left === 1 ? 'محاضرة واحدة' : lecturesPhrase(left)} في الجامعة` : 'انتهت محاضراتك الجامعية لليوم');
    }
    const due = data.commitments.filter(c => !c.done && ['today', 'overdue'].includes(dueInfo(c.dueDate, now).state)).length;
    if (due) parts.push(`${parts.length ? 'و' : 'لديك '}${due === 1 ? 'التزام واحد مستحق' : due === 2 ? 'التزامان مستحقان' : `${tasksPhrase(due)} مستحقة`}`);
    const minutes = sumMinutes(entriesOn(data.studyLog, dayKey(now)));
    const goal = dailyGoal(data);
    parts.push(minutes ? `ذاكرت ${formatMinutes(minutes)} من هدفك (${formatMinutes(goal)})` : `هدفك اليوم ${formatMinutes(goal)} مذاكرة`);
    return parts.join('، ').replace('، و', ' و') + '.';
  }, [classDay, group, classes, data, now]);

  return (
    <div>
      <header className="mb-8">
        <p className="m-0 text-[13px] font-medium text-brand">{formatLongDay(now)}</p>
        <h1 className="font-display m-0 mt-1 text-[2.2rem] font-normal leading-[1.3] text-brand-night sm:text-[2.8rem]">
          {greeting(now)}
          {name ? <span lang={/[؀-ۿ]/.test(name) ? undefined : 'en'}>، {name}</span> : null}
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-[15px] leading-relaxed text-subtle">{summary}</p>
      </header>

      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <NowPanel now={now} classNow={classNow} />
          <TodayTimeline items={items} now={now} dueToday={dueToday} group={group} classDay={classDay} />
        </div>
        <aside aria-label="نظرة سريعة" className="min-w-0 space-y-10 lg:pt-1">
          <TodayProgress now={now} />
          <UpNext />
          <Deadlines now={now} />
        </aside>
      </div>
    </div>
  );
}
