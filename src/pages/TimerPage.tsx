import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TimerSettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Progress, SectionHeader } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { formatClock } from '@/lib/dates';
import { formatMinutes, formatTime } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';
import { dismissCompletion, focusMinutesSoFar, settingError, skipBreak, startFromDraft, stopPomodoro, toggleTimerPause } from '@/features/timer/timerController';
import { dailyGoal, dayKey, entriesOn, sumMinutes } from '@/features/insights/selectors';
import { useMinuteNow } from '@/features/insights/hooks';

const PRESETS: Array<{ label: string; focus: number; shortBreak: number; longBreak: number }> = [
  { label: '25 / 5', focus: 25, shortBreak: 5, longBreak: 15 },
  { label: '50 / 10', focus: 50, shortBreak: 10, longBreak: 20 },
  { label: '90 / 20', focus: 90, shortBreak: 20, longBreak: 30 },
];

/** Thin progress ring (decorative; the clock inside carries the information). */
function Ring({ fraction, focus, children }: { fraction: number; focus: boolean; children: ReactNode }) {
  const r = 114;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto grid size-[min(78vw,20rem)] place-items-center sm:size-80">
      <svg viewBox="0 0 240 240" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="120" cy="120" r={r} fill="none" stroke={focus ? '#ffffff1a' : '#4a2f0c1a'} strokeWidth="4" />
        <circle
          cx="120"
          cy="120"
          r={r}
          fill="none"
          stroke={focus ? '#8fd6b3' : 'var(--color-accent)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const toggle = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);
  return { on, toggle, supported };
}

/** Running round: nothing but the course, the lecture, the clock and two controls. */
function FocusMode() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  const fs = useFullscreen();
  const focus = timer.mode === 'focus';
  const total = (focus ? timer.focus : timer.mode === 'longBreak' ? timer.longBreak : timer.shortBreak) * 60000;
  const remaining = remainingMs(timer, now);
  const round = focus ? (timer.completed || 0) + 1 : timer.completed;
  const inCycle = (timer.completed || 0) % timer.cycles;

  const finish = async () => {
    const minutes = focusMinutesSoFar();
    if (minutes >= 1) {
      const ok = await confirmAction(`سيُحفظ ما ذاكرته (${formatMinutes(minutes)}) في سجل المذاكرة.`, { title: 'إنهاء جولة التركيز؟', confirmLabel: 'إنهاء الجولة' });
      if (!ok) return;
    }
    stopPomodoro();
  };

  return (
    <section
      aria-label="وضع التركيز"
      className={cn(
        'relative -mx-4 -mt-4 flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-6 py-12 text-center transition-colors duration-700 sm:-mx-6 sm:-mt-6 sm:rounded-b-[32px] lg:-mx-10 lg:min-h-[calc(100dvh-4rem)] lg:rounded-[32px]',
        focus ? 'bg-brand-night text-dawn' : 'bg-[#f6ead4] text-[#4a2f0c]',
      )}
    >
      {fs.supported && (
        <button type="button" onClick={fs.toggle} aria-label={fs.on ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'} className="absolute end-4 top-4 grid size-10 place-items-center rounded-full opacity-70 transition hover:bg-white/10 hover:opacity-100">
          <Icon name={fs.on ? 'minimize' : 'maximize'} size={18} />
        </button>
      )}
      <p className="m-0 inline-flex items-center gap-2 text-[13px] font-medium opacity-75">
        <Icon name={focus ? 'timer' : 'coffee'} size={15} /> {timerModeLabel(timer)} · الجولة {round}
      </p>
      {focus ? (
        <>
          <h1 lang={langOf(timer.subject)} className="font-display m-0 mt-4 max-w-full truncate text-[2.4rem] font-normal leading-tight sm:text-6xl">
            {timer.subject}
          </h1>
          <p lang={langOf(timer.topic)} className="m-0 mt-1 max-w-full truncate text-lg opacity-75">
            {timer.topic}
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display m-0 mt-4 text-[2.4rem] font-normal leading-tight sm:text-6xl">خذ نفَسًا.</h1>
          <p className="m-0 mt-1 text-lg opacity-75">ستبدأ الجولة التالية عندما تكون جاهزًا.</p>
        </>
      )}

      <div className="my-10">
        <Ring fraction={total ? (total - remaining) / total : 0} focus={focus}>
          <p role="timer" aria-label="الوقت المتبقي" dir="ltr" className="m-0 text-7xl font-semibold tabular-nums tracking-tight sm:text-8xl">
            {formatClock(remaining)}
          </p>
          {timer.paused && <p className="m-0 mt-2 text-sm opacity-75">متوقف مؤقتًا</p>}
        </Ring>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant={focus ? 'dawn' : 'night'} size="xl" onClick={toggleTimerPause} className="min-w-40">
          <Icon name={timer.paused ? 'play' : 'pause'} size={16} /> {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
        </Button>
        {focus ? (
          <Button variant="onDark" size="xl" onClick={() => void finish()}>
            <Icon name="stop" size={15} /> إنهاء الجولة
          </Button>
        ) : (
          <Button variant="ghost" size="xl" onClick={skipBreak}>
            <Icon name="skip" size={15} /> تخطي الاستراحة
          </Button>
        )}
      </div>

      {/* Rounds until the long break. */}
      <ol aria-label={`${inCycle} من ${timer.cycles} جولات قبل الاستراحة الطويلة`} className="m-0 mt-10 flex list-none gap-2 p-0">
        {Array.from({ length: timer.cycles }, (_, i) => (
          <li key={i} className={cn('h-1.5 w-6 rounded-full', i < inCycle ? 'bg-current' : 'bg-current opacity-20')} />
        ))}
      </ol>
    </section>
  );
}

function SetupForm() {
  const draft = useTimerStore(s => s.draft);
  const setDraft = useTimerStore(s => s.setDraft);
  const courses = usePlannerStore(s => s.data.courses);
  const [touched, setTouched] = useState(false);
  const course = courses.find(c => c.id === draft.courseId);
  const lectures = course?.topics ?? [];
  const lectureValue = lectures.some(t => t.name === draft.topic) ? draft.topic : '__custom';
  const errors = {
    focus: settingError('focus', draft.focus),
    shortBreak: settingError('shortBreak', draft.shortBreak),
    longBreak: settingError('longBreak', draft.longBreak),
    cycles: settingError('cycles', draft.cycles),
  };
  const invalid = Object.values(errors).some(Boolean);
  const custom = !PRESETS.some(p => draft.focus === String(p.focus) && draft.shortBreak === String(p.shortBreak));
  const numberField = (key: keyof TimerSettings, label: string, unit?: string) => (
    <Field label={label} error={touched ? errors[key] : null}>
      {props => (
        <div className="relative">
          <TextInput {...props} type="number" inputMode="numeric" value={draft[key]} onChange={e => setDraft({ [key]: e.target.value } as Partial<typeof draft>)} className={unit ? 'pe-9' : undefined} />
          {unit && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-subtle">{unit}</span>}
        </div>
      )}
    </Field>
  );

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={e => {
        e.preventDefault();
        setTouched(true);
        if (invalid) return;
        startFromDraft();
      }}
    >
      <fieldset className="mx-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-3 p-0 text-[15px] font-semibold text-ink">ماذا ستذاكر؟</legend>
        <Field label="المادة">
          {props => (
            <Select {...props} value={course ? draft.courseId : ''} onChange={e => setDraft({ courseId: e.target.value, topic: '' })}>
              <option value="">مذاكرة عامة</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {course && lectures.length > 0 ? (
          <Field label="المحاضرة">
            {props => (
              <Select {...props} value={lectureValue} onChange={e => setDraft({ topic: e.target.value === '__custom' ? '' : e.target.value })}>
                {lectures.map(t => (
                  <option key={t.name} value={t.name}>
                    {t.done ? '✓ ' : ''}
                    {t.name}
                  </option>
                ))}
                <option value="__custom">موضوع آخر…</option>
              </Select>
            )}
          </Field>
        ) : (
          <Field label="الموضوع">{props => <TextInput {...props} value={draft.topic} maxLength={300} onChange={e => setDraft({ topic: e.target.value })} placeholder="ماذا ستذاكر؟" />}</Field>
        )}
        {course && lectures.length > 0 && lectureValue === '__custom' && (
          <div className="sm:col-span-2">
            <Field label="الموضوع">{props => <TextInput {...props} value={draft.topic} maxLength={300} onChange={e => setDraft({ topic: e.target.value })} placeholder="اكتب موضوع المذاكرة" />}</Field>
          </div>
        )}
      </fieldset>

      <fieldset className="mx-0 min-w-0 border-0 p-0">
        <legend className="mb-3 p-0 text-[15px] font-semibold text-ink">كم مدة الجولة؟</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="مدد جاهزة">
          {PRESETS.map(p => {
            const on = draft.focus === String(p.focus) && draft.shortBreak === String(p.shortBreak);
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft({ focus: String(p.focus), shortBreak: String(p.shortBreak), longBreak: String(p.longBreak) })}
                className={cn('rounded-2xl border px-4 py-2.5 text-start transition-colors', on ? 'border-brand bg-brand-soft text-brand-night' : 'border-line bg-white text-subtle hover:text-ink')}
              >
                <span dir="ltr" className="block text-lg font-semibold tabular-nums">
                  {p.label}
                </span>
                <span className="block text-xs">تركيز / استراحة (دقائق)</span>
              </button>
            );
          })}
        </div>
        <details className="group mt-4" open={custom || undefined}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand">
            <Icon name="chevronDown" size={15} className="transition-transform group-open:rotate-180" /> تخصيص المدد
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {numberField('focus', 'تركيز', 'د')}
            {numberField('shortBreak', 'استراحة قصيرة', 'د')}
            {numberField('longBreak', 'استراحة طويلة', 'د')}
            {numberField('cycles', 'جولات قبل الطويلة')}
          </div>
        </details>
      </fieldset>

      <Button type="submit" variant="night" size="xl" className="w-full sm:w-auto sm:min-w-56">
        <Icon name="play" size={16} /> ابدأ جولة التركيز
      </Button>
    </form>
  );
}

function CompletionNote() {
  const last = useTimerStore(s => s.timer.lastCompleted);
  const course = usePlannerStore(s => (last?.courseId ? s.data.courses.find(c => c.id === last.courseId) : undefined));
  const toggleLecture = usePlannerStore(s => s.toggleLecture);
  if (!last) return null;
  const index = course?.topics?.findIndex(t => t.name === last.topic) ?? -1;
  const lecture = index >= 0 ? course!.topics[index] : undefined;
  return (
    <div role="status" className="mb-10 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft px-5 py-4 motion-safe:animate-enter">
      <span className="grid size-9 place-items-center rounded-full bg-brand text-white">
        <Icon name="check" size={16} className="stroke-[3]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[15px] font-semibold text-brand-night">أحسنت! أنهيت جولة من {formatMinutes(last.minutes)}</p>
        <p className="m-0 truncate text-[13px] text-subtle">
          <span lang={langOf(last.subject)}>{last.subject}</span> — <span lang={langOf(last.topic)}>{last.topic}</span> · حُفظت في سجل المذاكرة
        </p>
      </div>
      {lecture && !lecture.done && (
        <Button
          variant="primary"
          onClick={async () => {
            await toggleLecture(course!.id, index);
            toast('تم تسجيل المحاضرة كمنجزة', 'success');
            dismissCompletion();
          }}
        >
          <Icon name="check" size={14} /> أنهيت المحاضرة
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={dismissCompletion} aria-label="إخفاء">
        <Icon name="close" size={16} />
      </Button>
    </div>
  );
}

function TodayRounds() {
  const data = usePlannerStore(s => s.data);
  const now = useMinuteNow();
  const today = useMemo(() => entriesOn(data.studyLog, dayKey(now)).reverse(), [data.studyLog, now]);
  const minutes = sumMinutes(today);
  const goal = dailyGoal(data);
  return (
    <section aria-labelledby="timer-today">
      <SectionHeader id="timer-today" title="جولات اليوم" description={`${formatMinutes(minutes)} من هدفك ${formatMinutes(goal)}`} />
      <Progress value={(minutes / goal) * 100} label="تقدّم الهدف اليومي" size="sm" className="mb-4" />
      {today.length ? (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {today.map(l => (
            <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={cn('size-2 shrink-0 rounded-full', l.completed ? 'bg-brand' : 'bg-accent')} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                <span lang={langOf(l.subject)} className="font-medium text-ink">
                  {l.subject}
                </span>
                <span className="text-subtle"> · </span>
                <span lang={langOf(l.topic)} className="text-subtle">
                  {l.topic}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-subtle">
                {formatTime(l.startedAt)} · {formatMinutes(l.duration)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-subtle">لم تُنهِ جولات اليوم بعد.</p>
      )}
    </section>
  );
}

/** Focus mode while a round runs; a calm setup form otherwise. */
export function TimerPage() {
  const active = useTimerStore(s => s.timer.active);
  const onBreak = useTimerStore(s => s.timer.mode !== 'focus');
  if (active)
    return (
      <>
        <FocusMode />
        {/* During the break, offer to mark the lecture just studied as done. */}
        {onBreak && (
          <div className="mt-8">
            <CompletionNote />
          </div>
        )}
      </>
    );
  return (
    <div>
      <header className="mb-10">
        <h1 className="font-display m-0 text-[2.1rem] font-normal leading-[1.3] text-brand-night sm:text-[2.6rem]">جولة تركيز</h1>
        <p className="m-0 mt-1.5 text-[15px] text-subtle">اختر ما ستذاكره ومدة الجولة. يُحفظ الوقت تلقائيًا في سجل المذاكرة.</p>
      </header>
      <CompletionNote />
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SetupForm />
        <TodayRounds />
      </div>
    </div>
  );
}
