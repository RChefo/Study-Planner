import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Progress, StatusChip } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatClock } from '@/lib/dates';
import { daysPhrase, dueText, formatMinutes, formatTime, relativeDay } from '@/lib/format';
import { STORAGE_KEYS, readLocal } from '@/lib/storageKeys';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { ROUTES, coursePath } from '@/routes/paths';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';
import { startLectureStudy, toggleTimerPause } from '@/features/timer/timerController';
import { DAY_KEYS, DAY_NAMES, getWeekInfo, periodsFor } from '@/features/timetable/schedule';
import type { Weekday } from '@/types';
import { DailyMinutesChart } from '@/features/insights/charts';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import { dailyGoal, dailyTotals, dayKey, entriesOn, nextUp, openCommitments, streaks, sumMinutes } from '@/features/insights/selectors';

/** Starts a lecture's focus round and opens the timer page. */
function useStartLecture() {
  const navigate = useNavigate();
  return (courseId: string, index: number) => {
    if (startLectureStudy(courseId, index)) navigate(ROUTES.timer);
  };
}

export function TodayProgressCard() {
  const data = usePlannerStore(s => s.data);
  const focus = useTimerStore(s => s.timer.focus);
  const now = useMinuteNow();
  const today = useMemo(() => entriesOn(data.studyLog, dayKey(now)), [data.studyLog, now]);
  const minutes = sumMinutes(today);
  const goal = dailyGoal(data);
  const pct = Math.min(100, Math.round((minutes / goal) * 100));
  const sessionGoal = Math.max(1, Math.ceil(goal / Math.max(1, focus)));
  const streak = useMemo(() => streaks(data.studyLog, now), [data.studyLog, now]);
  return (
    <Card aria-labelledby="today-progress" className="flex flex-col">
      <CardHeader id="today-progress" title="تقدّم اليوم" description={`هدفك اليومي ${formatMinutes(goal)}`} />
      <div className="flex flex-1 flex-col justify-between gap-4 px-4 pb-4 sm:px-5">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold text-ink">{formatMinutes(minutes)}</span>
            <span className="text-sm font-semibold text-brand">{pct}%</span>
          </div>
          <Progress value={pct} label="تقدّم الهدف اليومي" className="mt-3" />
          <p className="m-0 mt-2 text-[13px] text-subtle">
            {today.length} / {sessionGoal} جولات تركيز اليوم
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-stripe px-3 py-2 text-[13px]">
          <Icon name="flame" size={16} className={streak.current ? 'text-accent' : 'text-subtle'} />
          {streak.current ? (
            <span>
              سلسلة <b>{streak.current === 1 ? 'يوم واحد' : daysPhrase(streak.current)}</b> متتالية · الأطول {daysPhrase(streak.longest)}
            </span>
          ) : (
            <span className="text-subtle">ابدأ جولة اليوم لتبدأ سلسلة جديدة</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CurrentSessionCard() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  const data = usePlannerStore(s => s.data);
  const start = useStartLecture();
  const suggestion = useMemo(() => nextUp(data, null, 1)[0], [data]);

  if (timer.active) {
    const focus = timer.mode === 'focus';
    return (
      <Card aria-labelledby="current-session" className={cn('overflow-hidden', focus ? 'border-[#cfe3d6]' : 'border-[#f1dcc2]')}>
        <div className={cn('flex flex-wrap items-center justify-between gap-4 p-5', focus ? 'bg-linear-to-l from-mint to-white rtl:bg-linear-to-r' : 'bg-[#fffaf2]')}>
          <div className="min-w-0">
            <p id="current-session" className="m-0 text-xs font-semibold tracking-wide text-brand">
              {focus ? 'الجلسة الحالية' : 'استراحة'}
            </p>
            <p className="m-0 mt-1 truncate text-lg font-semibold text-ink">{focus ? timer.subject : timerModeLabel(timer)}</p>
            {focus && <p className="m-0 truncate text-sm text-subtle">{timer.topic}</p>}
          </div>
          <div className="text-4xl font-semibold tabular-nums text-ink" dir="ltr" role="timer" aria-label="الوقت المتبقي">
            {formatClock(remainingMs(timer, now))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
          <Button variant="primary" size="sm" onClick={toggleTimerPause}>
            <Icon name={timer.paused ? 'play' : 'pause'} size={14} /> {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
          </Button>
          <ButtonLink to={ROUTES.timer} size="sm">
            فتح المؤقت
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="next-session">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p id="next-session" className="m-0 text-xs font-semibold tracking-wide text-brand">
            الجلسة التالية
          </p>
          {suggestion ? (
            <>
              <p className="m-0 mt-1 truncate text-lg font-semibold text-ink">{suggestion.info.course.name}</p>
              <p className="m-0 truncate text-sm text-subtle">{suggestion.lecture.name}</p>
            </>
          ) : (
            <p className="m-0 mt-1 text-sm text-subtle">لا توجد محاضرات متبقية. أضف محاضرات لموادك أو ابدأ جولة حرة.</p>
          )}
        </div>
        {suggestion ? (
          <Button variant="primary" size="lg" onClick={() => start(suggestion.info.course.id, suggestion.lecture.index)}>
            <Icon name="play" size={16} /> ابدأ المذاكرة
          </Button>
        ) : (
          <ButtonLink to={ROUTES.timer} variant="primary" size="lg">
            <Icon name="timer" size={16} /> جولة تركيز حرة
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

export function TodayPlanCard() {
  const data = usePlannerStore(s => s.data);
  const timer = useTimerStore(s => s.timer);
  const now = useMinuteNow();
  const start = useStartLecture();
  const done = useMemo(() => entriesOn(data.studyLog, dayKey(now)), [data.studyLog, now]);
  const next = useMemo(() => nextUp(data, timer.active ? timer : null, 4), [data, timer]);
  const running = timer.active && timer.mode === 'focus';
  const upcoming = next.filter(n => !(running && n.info.course.name === timer.subject && n.lecture.name === timer.topic)).slice(0, 3);

  return (
    <Card aria-labelledby="today-plan">
      <CardHeader id="today-plan" title="اليوم" description="ما أنجزته وما ينتظرك" />
      {!done.length && !running && !upcoming.length ? (
        <EmptyState icon="book" title="لا شيء مخطط بعد" description="أضف مادة ومحاضراتها لتظهر هنا خطتك اليومية." action={<ButtonLink to={ROUTES.courses} size="sm">إضافة مادة</ButtonLink>} />
      ) : (
        <ol className="m-0 list-none px-2 pb-3 sm:px-3">
          {done.map(l => (
            <li key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
              <Icon name={l.completed ? 'checkCircle' : 'clock'} size={18} className={l.completed ? 'text-brand' : 'text-accent'} />
              <span className="sr-only">{l.completed ? 'مكتملة:' : 'أُوقفت مبكرًا:'}</span>
              <span className="min-w-0 flex-1 truncate text-subtle line-through decoration-[#b9c4be]">
                {l.subject} — {l.topic}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-subtle">{formatMinutes(l.duration)}</span>
            </li>
          ))}
          {running && (
            <li className="flex items-center gap-3 rounded-lg bg-mint px-2 py-2 text-sm">
              <Icon name="arrow" size={18} className="text-brand" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {timer.subject} — {timer.topic}
              </span>
              <StatusChip tone="progress">جارية</StatusChip>
            </li>
          )}
          {upcoming.map(n => (
            <li key={`${n.info.course.id}-${n.lecture.index}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
              <Icon name="circle" size={18} className="text-[#b9c4be]" />
              <span className="min-w-0 flex-1 truncate text-ink">
                {n.info.course.name} — {n.lecture.name}
              </span>
              <Button size="sm" variant="ghost" onClick={() => start(n.info.course.id, n.lecture.index)} aria-label={`ابدأ مذاكرة ${n.lecture.name}`} disabled={timer.active}>
                <Icon name="play" size={13} /> ابدأ
              </Button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const DUE_TONE = { overdue: 'danger', today: 'warning', tomorrow: 'warning', soon: 'info', later: 'idle', none: 'idle' } as const;

export function UpcomingCommitmentsCard() {
  const commitments = usePlannerStore(s => s.data.commitments);
  const now = useMinuteNow();
  const open = useMemo(() => openCommitments(commitments, now), [commitments, now]);
  return (
    <Card aria-labelledby="upcoming-commitments">
      <CardHeader id="upcoming-commitments" title="الالتزامات القادمة" action={<Link to={ROUTES.commitments} className="text-[13px] font-medium text-brand no-underline hover:underline">عرض الكل</Link>} />
      {open.length ? (
        <ul className="m-0 list-none px-2 pb-3 sm:px-3">
          {open.slice(0, 5).map(({ commitment, due }) => (
            <li key={commitment.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm">
              <span className="min-w-0 truncate text-ink">{commitment.name || 'بدون عنوان'}</span>
              <StatusChip tone={DUE_TONE[due.state]} icon={due.state === 'overdue' ? 'alert' : 'clock'}>
                {dueText(due)}
              </StatusChip>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="clipboard" title="لا توجد التزامات قيد التنفيذ" description="أحسنت! كل مهامك منجزة." />
      )}
    </Card>
  );
}

export function TimetableTodayCard() {
  const now = useMinuteNow();
  const group = readLocal(STORAGE_KEYS.timetableGroup) ?? '';
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now) as Weekday;
  const isClassDay = DAY_KEYS.includes(name);
  const periods = isClassDay ? periodsFor(name, group, getWeekInfo(new Date(now)).section) : [];
  return (
    <Card aria-labelledby="timetable-today">
      <CardHeader
        id="timetable-today"
        title="محاضرات اليوم"
        description={isClassDay ? `${DAY_NAMES[name]} · ${group ? `المجموعة ${group}` : 'كل المجموعات'}` : 'لا توجد محاضرات جامعية اليوم'}
        action={<Link to={ROUTES.timetable} className="text-[13px] font-medium text-brand no-underline hover:underline">الجدول</Link>}
      />
      {periods.length ? (
        <ul className="m-0 list-none px-2 pb-3 sm:px-3">
          {periods.slice(0, 5).map(p => (
            <li key={p.period} className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm">
              <span className="w-24 shrink-0 text-xs tabular-nums text-subtle" dir="ltr">
                {p.time}
              </span>
              <span dir="auto" className="min-w-0 flex-1 truncate text-start text-ink">{p.classes[0].subjects[0]?.title}</span>
            </li>
          ))}
          {!group && <li className="px-2 pt-1 text-xs text-subtle">اختر مجموعتك من الإعدادات لعرض محاضراتك فقط.</li>}
        </ul>
      ) : (
        <EmptyState icon="calendar" title={isClassDay ? 'لا محاضرات لمجموعتك اليوم' : 'يوم بلا محاضرات'} description="استغل الوقت في مراجعة المواد." />
      )}
    </Card>
  );
}

export function WeekChartCard() {
  const log = usePlannerStore(s => s.data.studyLog);
  const now = useMinuteNow();
  const days = useMemo(() => dailyTotals(log, now, 7), [log, now]);
  const week = days.reduce((n, d) => n + d.minutes, 0);
  return (
    <Card aria-labelledby="week-chart">
      <CardHeader id="week-chart" title="دقائق المذاكرة — آخر 7 أيام" description={`المجموع ${formatMinutes(week)}`} action={<Link to={ROUTES.stats} className="text-[13px] font-medium text-brand no-underline hover:underline">الإحصائيات</Link>} />
      <div className="px-4 pb-4 sm:px-5">
        <DailyMinutesChart days={days} title="دقائق المذاكرة في آخر 7 أيام" height={150} />
      </div>
    </Card>
  );
}

export function CoursesProgressCard() {
  const infos = useCourseInfos();
  const sorted = [...infos].sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0)).slice(0, 5);
  return (
    <Card aria-labelledby="courses-progress">
      <CardHeader id="courses-progress" title="تقدّم المواد" action={<Link to={ROUTES.courses} className="text-[13px] font-medium text-brand no-underline hover:underline">كل المواد</Link>} />
      {sorted.length ? (
        <ul className="m-0 list-none px-4 pb-4 sm:px-5">
          {sorted.map(info => (
            <li key={info.course.id} className="border-t border-line py-2.5 first:border-t-0">
              <Link to={coursePath(info.course.id)} className="group block no-underline">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink group-hover:text-brand">{info.course.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-subtle">
                    {info.done}/{info.total} · {info.percent}%
                  </span>
                </div>
                <Progress value={info.percent} label={`تقدّم ${info.course.name}`} size="sm" className="mt-2" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="folder" title="لم تضف أي مادة بعد" action={<ButtonLink to={ROUTES.courses} size="sm" variant="primary"><Icon name="plus" size={14} /> أضف مادة</ButtonLink>} />
      )}
    </Card>
  );
}

export function RecentActivityCard() {
  const log = usePlannerStore(s => s.data.studyLog);
  const now = useMinuteNow();
  const recent = useMemo(() => [...log].sort((a, b) => b.startedAt - a.startedAt).slice(0, 5), [log]);
  return (
    <Card aria-labelledby="recent-activity">
      <CardHeader id="recent-activity" title="آخر النشاط" action={<Link to={ROUTES.studyLog} className="text-[13px] font-medium text-brand no-underline hover:underline">السجل</Link>} />
      {recent.length ? (
        <ul className="m-0 list-none px-4 pb-3 sm:px-5">
          {recent.map(l => (
            <li key={l.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
              <span className={cn('size-2 shrink-0 rounded-full', l.completed ? 'bg-brand-bright' : 'bg-accent')} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-ink">{l.subject}</p>
                <p className="m-0 truncate text-xs text-subtle">
                  {l.topic} · {relativeDay(l.startedAt, now)} {formatTime(l.startedAt)}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-subtle">{formatMinutes(l.duration)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="history" title="لا نشاط بعد" description="ستظهر هنا جولات التركيز بعد إنهائها." />
      )}
    </Card>
  );
}
