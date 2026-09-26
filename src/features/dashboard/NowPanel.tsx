import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatClock } from '@/lib/dates';
import { formatMinutes, formatTime, lecturesPhrase, relativeDay } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction } from '@/stores/uiStore';
import { ROUTES, coursePath } from '@/routes/paths';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';
import { focusMinutesSoFar, skipBreak, startLectureStudy, stopPomodoro, toggleTimerPause } from '@/features/timer/timerController';
import { nextUp } from '@/features/insights/selectors';
import type { UniClass } from '@/features/timetable/schedule';
import { atMinutes } from '@/features/timetable/classTimes';

/** Dark "ground" panel shared by every NOW state (echoes the landing page's hill). */
function Panel({ tone = 'night', label, children }: { tone?: 'night' | 'break'; label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className={cn(
        'relative overflow-hidden rounded-[28px] px-6 py-7 sm:px-9 sm:py-9',
        tone === 'night' ? 'bg-brand-night text-dawn' : 'bg-[#f6ead4] text-[#4a2f0c]',
      )}
    >
      {/* the path motif, faint, running off the panel */}
      <svg aria-hidden="true" viewBox="0 0 600 240" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full opacity-[0.12] rtl:-scale-x-100" focusable="false">
        <path d="M-10 230 C 140 200, 220 120, 330 150 C 430 178, 480 80, 610 40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
      </svg>
      <div className="relative">{children}</div>
    </section>
  );
}

function Eyebrow({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <p className="m-0 inline-flex items-center gap-2 text-[13px] font-medium opacity-80">
      {live && <span aria-hidden="true" className="size-2 rounded-full bg-[#8fd6b3] motion-safe:animate-pulse" />}
      {children}
    </p>
  );
}

/** "At university now: Big Data · A202 until 11:00" — shown inside the panel during a class. */
function ClassNowNote({ cls, now }: { cls: UniClass; now: number }) {
  if (!cls.range) return null;
  return (
    <p className="m-0 mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px]">
      <Icon name="calendar" size={14} />
      <span className="truncate">
        في الجامعة الآن: <span lang={langOf(cls.title)}>{cls.title}</span>
        {cls.room ? ` · ${cls.room}` : ''} حتى {formatTime(atMinutes(now, cls.range.end))}
      </span>
    </p>
  );
}

function RunningFocus() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  const total = timer.focus * 60000;
  const remaining = remainingMs(timer, now);
  const finish = async () => {
    const minutes = focusMinutesSoFar();
    if (minutes >= 1) {
      const ok = await confirmAction(`سيُحفظ ما ذاكرته (${formatMinutes(minutes)}) في سجل المذاكرة.`, { title: 'إنهاء جولة التركيز؟', confirmLabel: 'إنهاء الجولة' });
      if (!ok) return;
    }
    stopPomodoro();
  };
  return (
    <Panel label="الجلسة الحالية">
      <Eyebrow live={!timer.paused}>{timer.paused ? 'الجولة متوقفة مؤقتًا' : 'تذاكر الآن'}</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <h2 lang={langOf(timer.subject)} className="font-display m-0 truncate text-[2.2rem] font-normal leading-[1.2] sm:text-5xl">
            {timer.subject}
          </h2>
          <p lang={langOf(timer.topic)} className="m-0 mt-1 truncate text-[17px] text-dawn/75">
            {timer.topic}
          </p>
        </div>
        <p role="timer" aria-label="الوقت المتبقي" dir="ltr" className="m-0 text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl">
          {formatClock(remaining)}
        </p>
      </div>
      <Progress value={total ? ((total - remaining) / total) * 100 : 0} label="تقدّم الجولة" tone="light" size="xs" className="mt-6" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="dawn" size="xl" onClick={toggleTimerPause}>
          <Icon name={timer.paused ? 'play' : 'pause'} size={16} /> {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
        </Button>
        <Button variant="onDark" size="xl" onClick={() => void finish()}>
          <Icon name="stop" size={15} /> إنهاء الجولة
        </Button>
        <Link to={ROUTES.timer} className="ms-auto inline-flex items-center gap-1.5 text-[13px] text-dawn/75 no-underline hover:text-dawn">
          <Icon name="maximize" size={15} /> وضع التركيز
        </Link>
      </div>
    </Panel>
  );
}

function RunningBreak() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  return (
    <Panel tone="break" label="استراحة">
      <Eyebrow>{timerModeLabel(timer)}</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-display m-0 text-[2.2rem] font-normal leading-[1.2] sm:text-5xl">خذ نفَسًا.</h2>
          <p className="m-0 mt-1 text-[15px] opacity-75">ابتعد عن الشاشة قليلًا؛ ستعود الجولة التالية أوضح.</p>
        </div>
        <p role="timer" aria-label="الوقت المتبقي للاستراحة" dir="ltr" className="m-0 text-6xl font-semibold tabular-nums tracking-tight">
          {formatClock(remainingMs(timer, now))}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="night" size="xl" onClick={toggleTimerPause}>
          <Icon name={timer.paused ? 'play' : 'pause'} size={16} /> {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
        </Button>
        <Button variant="ghost" size="xl" onClick={skipBreak}>
          <Icon name="skip" size={15} /> تخطي الاستراحة
        </Button>
      </div>
    </Panel>
  );
}

/** The single most important element on Today: what to study now, or the round in progress. */
export function NowPanel({ now, classNow }: { now: number; classNow: UniClass | null }) {
  const active = useTimerStore(s => s.timer.active);
  const mode = useTimerStore(s => s.timer.mode);
  const focusLength = useTimerStore(s => s.timer.focus);
  const data = usePlannerStore(s => s.data);
  const navigate = useNavigate();
  const suggestion = useMemo(() => nextUp(data, null, 1)[0], [data]);

  if (active) return mode === 'focus' ? <RunningFocus /> : <RunningBreak />;

  if (!data.courses.length) {
    return (
      <Panel label="ابدأ">
        {classNow && <ClassNowNote cls={classNow} now={now} />}
        <Eyebrow>ابدأ من هنا</Eyebrow>
        <h2 className="font-display m-0 mt-3 text-[2.2rem] font-normal leading-[1.25] sm:text-5xl">ابنِ مسارك الأول.</h2>
        <p className="m-0 mt-2 max-w-lg text-[15px] leading-relaxed text-dawn/75">أضف مادة ومحاضراتها، وسيقترح عليك <span className="whitespace-nowrap">Study Planner</span> ما تذاكره كل يوم.</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <ButtonLink to={ROUTES.courses} variant="dawn" size="xl">
            <Icon name="plus" size={16} /> أضف أول مادة
          </ButtonLink>
          <ButtonLink to={ROUTES.timer} variant="onDark" size="xl">
            جولة تركيز حرة
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  if (!suggestion) {
    return (
      <Panel label="لا محاضرات متبقية">
        {classNow && <ClassNowNote cls={classNow} now={now} />}
        <Eyebrow>كل شيء منجز</Eyebrow>
        <h2 className="font-display m-0 mt-3 text-[2.2rem] font-normal leading-[1.25] sm:text-5xl">أنهيت كل محاضراتك.</h2>
        <p className="m-0 mt-2 max-w-lg text-[15px] leading-relaxed text-dawn/75">راجع ما ذاكرته بجولة حرة، أو أضف محاضرات جديدة لموادك.</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <ButtonLink to={ROUTES.timer} variant="dawn" size="xl">
            <Icon name="timer" size={16} /> جولة مراجعة
          </ButtonLink>
          <ButtonLink to={ROUTES.courses} variant="onDark" size="xl">
            المواد
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  const { info, lecture } = suggestion;
  const start = () => startLectureStudy(info.course.id, lecture.index) && navigate(ROUTES.timer);
  return (
    <Panel label="ما تذاكره الآن">
      {classNow && <ClassNowNote cls={classNow} now={now} />}
      <Eyebrow>{lecture.status === 'in-progress' ? 'أكمل من حيث توقفت' : 'التالي في خطتك'}</Eyebrow>
      <h2 className="m-0 mt-3">
        <Link to={coursePath(info.course.id)} lang={langOf(info.course.name)} className="font-display block truncate text-[2.2rem] font-normal leading-[1.2] text-dawn no-underline hover:underline sm:text-5xl">
          {info.course.name}
        </Link>
      </h2>
      <p lang={langOf(lecture.name)} className="m-0 mt-1.5 text-lg text-dawn/80 [overflow-wrap:anywhere]">
        {lecture.name}
      </p>
      <dl className="m-0 mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-dawn/70">
        <div className="flex gap-1.5">
          <dt className="sr-only">مدة الجولة</dt>
          <Icon name="timer" size={15} />
          <dd className="m-0">جولة تركيز {focusLength} د</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">تقدّم المادة</dt>
          <Icon name="book" size={15} />
          <dd className="m-0">
            {info.done} من {info.total === 1 ? 'محاضرة واحدة' : lecturesPhrase(info.total)} منجزة
          </dd>
        </div>
        {lecture.lastStudiedAt && (
          <div className="flex gap-1.5">
            <dt className="sr-only">آخر مذاكرة</dt>
            <Icon name="history" size={15} />
            <dd className="m-0">
              آخر مرة {relativeDay(lecture.lastStudiedAt, now)} · {formatMinutes(lecture.minutes)}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Button variant="dawn" size="xl" onClick={start}>
          <Icon name="play" size={16} /> ابدأ المذاكرة
        </Button>
        <ButtonLink to={ROUTES.timer} variant="onDark" size="xl">
          اختر شيئًا آخر
        </ButtonLink>
      </div>
    </Panel>
  );
}
