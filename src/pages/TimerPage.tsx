import { useMemo, useState } from 'react';
import type { TimerSettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Progress } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { formatClock } from '@/lib/dates';
import { formatMinutes, formatTime } from '@/lib/format';
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

/** Progress ring (decorative; the numbers beside it carry the information). */
function Ring({ fraction, focus, children }: { fraction: number; focus: boolean; children: React.ReactNode }) {
  const r = 108;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto grid size-64 place-items-center sm:size-72">
      <svg viewBox="0 0 240 240" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="120" cy="120" r={r} fill="none" stroke="#e9eee9" strokeWidth="10" />
        <circle
          cx="120"
          cy="120"
          r={r}
          fill="none"
          stroke={focus ? 'var(--color-brand-bright)' : 'var(--color-accent)'}
          strokeWidth="10"
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
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        setTouched(true);
        if (invalid) return;
        startFromDraft();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div>
        <p className="m-0 mb-2 text-[13px] font-medium text-ink">المدد</p>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="مدد جاهزة">
          {PRESETS.map(p => {
            const on = draft.focus === String(p.focus) && draft.shortBreak === String(p.shortBreak);
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft({ focus: String(p.focus), shortBreak: String(p.shortBreak), longBreak: String(p.longBreak) })}
                className={cn('rounded-lg border px-3 py-1.5 text-[13px] tabular-nums transition-colors', on ? 'border-brand bg-mint font-semibold text-brand-deep' : 'border-line bg-white text-subtle hover:text-ink')}
                dir="ltr"
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {numberField('focus', 'تركيز', 'د')}
          {numberField('shortBreak', 'استراحة قصيرة', 'د')}
          {numberField('longBreak', 'استراحة طويلة', 'د')}
          {numberField('cycles', 'جولات قبل الطويلة')}
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full">
        <Icon name="play" size={16} /> ابدأ جولة التركيز
      </Button>
    </form>
  );
}

function CompletionCard() {
  const last = useTimerStore(s => s.timer.lastCompleted);
  const course = usePlannerStore(s => (last?.courseId ? s.data.courses.find(c => c.id === last.courseId) : undefined));
  const toggleLecture = usePlannerStore(s => s.toggleLecture);
  if (!last) return null;
  const index = course?.topics?.findIndex(t => t.name === last.topic) ?? -1;
  const lecture = index >= 0 ? course!.topics[index] : undefined;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#cfe3d6] bg-mint px-4 py-3">
      <Icon name="checkCircle" size={22} className="text-brand" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-brand-deep">أحسنت! أنهيت جولة تركيز لمدة {formatMinutes(last.minutes)}</p>
        <p className="m-0 truncate text-xs text-subtle">
          {last.subject} — {last.topic} · حُفظت في سجل المذاكرة
        </p>
      </div>
      {lecture && !lecture.done && (
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            await toggleLecture(course!.id, index);
            toast('تم تسجيل المحاضرة كمكتملة', 'success');
            dismissCompletion();
          }}
        >
          <Icon name="check" size={14} /> تمت مذاكرة المحاضرة
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={dismissCompletion} aria-label="إخفاء">
        <Icon name="close" size={16} />
      </Button>
    </div>
  );
}

function TodaySidebar() {
  const data = usePlannerStore(s => s.data);
  const now = useMinuteNow();
  const today = useMemo(() => entriesOn(data.studyLog, dayKey(now)).reverse(), [data.studyLog, now]);
  const minutes = sumMinutes(today);
  const goal = dailyGoal(data);
  return (
    <Card aria-labelledby="timer-today">
      <CardHeader id="timer-today" title="جولات اليوم" description={`${formatMinutes(minutes)} من ${formatMinutes(goal)}`} />
      <div className="px-4 pb-2 sm:px-5">
        <Progress value={(minutes / goal) * 100} label="تقدّم الهدف اليومي" />
      </div>
      {today.length ? (
        <ul className="m-0 list-none px-4 pb-3 sm:px-5">
          {today.map(l => (
            <li key={l.id} className="flex items-center gap-2.5 border-t border-line py-2 text-sm first:border-t-0">
              <Icon name={l.completed ? 'checkCircle' : 'clock'} size={16} className={l.completed ? 'text-brand' : 'text-accent'} />
              <span className="min-w-0 flex-1 truncate">{l.topic}</span>
              <span className="shrink-0 text-xs tabular-nums text-subtle">
                {formatTime(l.startedAt)} · {formatMinutes(l.duration)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="timer" title="لم تُكمل جولات اليوم بعد" className="py-6" />
      )}
    </Card>
  );
}

export function TimerPage() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  const focus = timer.mode === 'focus';
  const total = (focus ? timer.focus : timer.mode === 'longBreak' ? timer.longBreak : timer.shortBreak) * 60000;
  const remaining = remainingMs(timer, now);
  const elapsed = Math.max(0, total - remaining);

  const stop = async () => {
    const minutes = focusMinutesSoFar();
    if (focus && minutes >= 1) {
      const ok = await confirmAction(`سيُحفظ ما ذاكرته (${formatMinutes(minutes)}) في سجل المذاكرة.`, { title: 'إنهاء جولة التركيز؟', confirmLabel: 'إنهاء الجولة' });
      if (!ok) return;
    }
    stopPomodoro();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <CompletionCard />
        <Card className="p-5 sm:p-6">
          {timer.active ? (
            <div className="flex flex-col items-center">
              <p className={cn('m-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold', focus ? 'bg-mint text-brand-deep' : 'bg-[#fff4e6] text-[#8a4a12]')}>
                <Icon name={focus ? 'timer' : 'coffee'} size={15} /> {timerModeLabel(timer)}
                <span className="font-normal text-subtle">· الجولة {focus ? (timer.completed || 0) + 1 : timer.completed}</span>
              </p>
              <div className="my-6">
                <Ring fraction={total ? elapsed / total : 0} focus={focus}>
                  <div className="text-6xl font-semibold tabular-nums text-ink sm:text-7xl" dir="ltr" role="timer" aria-label="الوقت المتبقي">
                    {formatClock(remaining)}
                  </div>
                  <div className="mt-1 text-[13px] text-subtle">
                    مضى <span dir="ltr" className="tabular-nums">{formatClock(elapsed)}</span>
                  </div>
                </Ring>
              </div>
              {focus ? (
                <div className="mb-6 max-w-full text-center">
                  <p className="m-0 truncate text-lg font-semibold text-ink">{timer.subject}</p>
                  <p className="m-0 truncate text-sm text-subtle">{timer.topic}</p>
                </div>
              ) : (
                <p className="m-0 mb-6 text-sm text-subtle">استرح قليلًا؛ ستبدأ الجولة التالية عندما تكون جاهزًا.</p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="lg" onClick={toggleTimerPause}>
                  <Icon name={timer.paused ? 'play' : 'pause'} size={16} /> {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
                </Button>
                {focus ? (
                  <Button size="lg" onClick={() => void stop()}>
                    <Icon name="stop" size={15} /> إنهاء
                  </Button>
                ) : (
                  <Button size="lg" onClick={skipBreak}>
                    <Icon name="skip" size={15} /> تخطي الاستراحة
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="m-0 mb-1 text-xl font-bold text-ink">جولة تركيز جديدة</h1>
              <p className="m-0 mb-5 text-sm text-subtle">اختر ما ستذاكره ومدة الجولة. يُحفظ الوقت تلقائيًا في سجل المذاكرة.</p>
              <SetupForm />
            </>
          )}
        </Card>
      </div>
      <TodaySidebar />
    </div>
  );
}
