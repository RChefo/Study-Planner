import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Progress, SectionHeader, sectionLinkClass } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { daysPhrase, dueText, formatMinutes, formatWeekday, roundsPhrase } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { ROUTES, coursePath } from '@/routes/paths';
import { startLectureStudy } from '@/features/timer/timerController';
import { dailyGoal, dailyTotals, dayKey, entriesOn, nextUp, openCommitments, streaks, sumMinutes } from '@/features/insights/selectors';

/** Compact "how am I doing today" block: minutes vs goal, rounds, streak, and the week at a glance. */
export function TodayProgress({ now }: { now: number }) {
  const data = usePlannerStore(s => s.data);
  const today = useMemo(() => entriesOn(data.studyLog, dayKey(now)), [data.studyLog, now]);
  const week = useMemo(() => dailyTotals(data.studyLog, now, 7), [data.studyLog, now]);
  const streak = useMemo(() => streaks(data.studyLog, now), [data.studyLog, now]);
  const minutes = sumMinutes(today);
  const goal = dailyGoal(data);
  const pct = Math.min(100, Math.round((minutes / goal) * 100));
  const weekMax = Math.max(goal, ...week.map(d => d.minutes));

  return (
    <section aria-labelledby="today-progress">
      <SectionHeader id="today-progress" title="تقدّم اليوم" action={<Link to={ROUTES.stats} className={sectionLinkClass}>الإحصائيات</Link>} />
      <p className="m-0 flex items-baseline gap-2">
        <span className="text-[1.9rem] font-semibold tracking-tight text-ink">{formatMinutes(minutes)}</span>
        <span className="text-sm text-subtle">من {formatMinutes(goal)}</span>
        <span className="ms-auto text-sm font-semibold tabular-nums text-brand">{pct}%</span>
      </p>
      <Progress value={pct} label="تقدّم الهدف اليومي" className="mt-3" />
      <p className="m-0 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-subtle">
        <span>{today.length ? `${today.length === 1 ? 'جولة واحدة' : roundsPhrase(today.length)} اليوم` : 'لا جولات بعد اليوم'}</span>
        <span className="inline-flex items-center gap-1">
          <Icon name="flame" size={14} className={streak.current ? 'text-accent' : undefined} />
          {streak.current ? `${streak.current === 1 ? 'يوم واحد' : daysPhrase(streak.current)} متتالية` : 'ابدأ سلسلة اليوم'}
        </span>
      </p>

      {/* The last 7 days; today is last (on the reading end). */}
      <ol aria-label="دقائق المذاكرة في آخر 7 أيام" className="m-0 mt-5 grid list-none grid-cols-7 items-end gap-1.5 p-0">
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <li key={d.key} className="flex flex-col items-center gap-1.5">
              <span className="flex h-12 w-full items-end overflow-hidden rounded-md bg-[#e8ede7]">
                <span
                  className={cn('block w-full rounded-md transition-[height] duration-700', isToday ? 'bg-brand' : 'bg-brand-bright/55')}
                  style={{ height: `${d.minutes ? Math.max(8, (d.minutes / weekMax) * 100) : 0}%` }}
                />
              </span>
              <span className={cn('text-[11px]', isToday ? 'font-semibold text-ink' : 'text-muted')}>{isToday ? 'اليوم' : formatWeekday(d.date)}</span>
              <span className="sr-only">{formatMinutes(d.minutes)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Other courses' next lectures (the first suggestion is already the NOW panel). */
export function UpNext() {
  const data = usePlannerStore(s => s.data);
  const timerActive = useTimerStore(s => s.timer.active);
  const navigate = useNavigate();
  const queue = useMemo(() => nextUp(data, null, 5).slice(timerActive ? 0 : 1, timerActive ? 4 : 5), [data, timerActive]);
  if (!queue.length) return null;
  return (
    <section aria-labelledby="up-next">
      <SectionHeader id="up-next" title="بعد ذلك" action={<Link to={ROUTES.courses} className={sectionLinkClass}>المواد</Link>} />
      <ul className="m-0 list-none divide-y divide-line p-0">
        {queue.map(({ info, lecture }) => (
          <li key={info.course.id} className="group flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Link to={coursePath(info.course.id)} lang={langOf(info.course.name)} className="block truncate text-[13px] font-medium text-subtle no-underline hover:text-brand">
                {info.course.name}
              </Link>
              <p lang={langOf(lecture.name)} className="m-0 truncate text-sm font-semibold text-ink">
                {lecture.name}
              </p>
              <Progress value={info.percent} label={`تقدّم ${info.course.name}`} size="xs" className="mt-2 max-w-40" />
            </div>
            <button
              type="button"
              disabled={timerActive}
              onClick={() => startLectureStudy(info.course.id, lecture.index) && navigate(ROUTES.timer)}
              aria-label={`ابدأ مذاكرة ${lecture.name}`}
              title={timerActive ? 'هناك جولة جارية' : undefined}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-brand transition-colors hover:border-brand hover:bg-brand hover:text-white disabled:opacity-40"
            >
              <Icon name="play" size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Overdue and next-7-days commitments with a small calendar tag. */
export function Deadlines({ now }: { now: number }) {
  const commitments = usePlannerStore(s => s.data.commitments);
  const soon = useMemo(() => openCommitments(commitments, now).filter(c => c.due.days !== null && c.due.days <= 7), [commitments, now]);
  return (
    <section aria-labelledby="deadlines">
      <SectionHeader id="deadlines" title="المواعيد القادمة" action={<Link to={ROUTES.commitments} className={sectionLinkClass}>الكل</Link>} />
      {soon.length ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {soon.slice(0, 5).map(({ commitment, due }) => {
            const date = new Date(`${commitment.dueDate}T12:00:00`);
            const late = due.state === 'overdue';
            return (
              <li key={commitment.id}>
                <Link to={ROUTES.commitments} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 no-underline transition-colors hover:bg-white">
                  <span className={cn('grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center leading-tight', late ? 'bg-[#f8e8dc] text-[#94401a]' : 'bg-white text-brand-night ring-1 ring-line')}>
                    <span className="text-base font-semibold tabular-nums">{date.getDate()}</span>
                    <span className="text-[10px]">{new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(date)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span lang={langOf(commitment.name)} className="block truncate text-sm font-medium text-ink">
                      {commitment.name || 'بدون عنوان'}
                    </span>
                    <span className={cn('text-xs', late ? 'font-medium text-[#94401a]' : 'text-subtle')}>{dueText(due)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-subtle">لا مواعيد خلال الأسبوع القادم. جدولك صافٍ.</p>
      )}
    </section>
  );
}
