import { useTimerStore, type TimerDraft } from '@/stores/timerStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { formatClock } from '@/lib/dates';
import { Button, MiniButton } from '@/components/ui/Button';
import { Field, TextInput, inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { remainingMs, timerModeLabel } from './timerMath';
import { minimizeTimer, showTimerDock, showTimerSetup, startQuickStudy, stopPomodoro, toggleTimerPause } from './timerController';

const SETTINGS: Array<{ key: keyof TimerDraft; label: string; min: number; max: number; unit?: string }> = [
  { key: 'focus', label: 'تركيز', min: 1, max: 180, unit: 'د' },
  { key: 'shortBreak', label: 'استراحة قصيرة', min: 1, max: 60, unit: 'د' },
  { key: 'longBreak', label: 'طويلة', min: 1, max: 90, unit: 'د' },
  { key: 'cycles', label: 'دورات قبل الطويلة', min: 2, max: 8 },
];

function TimerSetup() {
  const draft = useTimerStore(s => s.draft);
  const setDraft = useTimerStore(s => s.setDraft);
  const courses = usePlannerStore(s => s.data.courses);
  const courseId = courses.some(c => c.id === draft.courseId) ? draft.courseId : '';

  return (
    <div>
      <Field label="المادة">
        {id => (
          <select id={id} className={cn(inputClass, 'p-2')} value={courseId} onChange={e => setDraft({ courseId: e.target.value })}>
            <option value="">مذاكرة عامة</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="mt-2">
        <Field label="المحاضرة / الموضوع">
          {id => <TextInput id={id} className="p-2" value={draft.topic} onChange={e => setDraft({ topic: e.target.value })} placeholder="اكتب موضوع المذاكرة" />}
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {SETTINGS.map(s => (
          <label key={s.key} className="flex flex-col gap-1 text-[11px] text-muted">
            {s.label}
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={s.min}
                max={s.max}
                value={draft[s.key]}
                onChange={e => setDraft({ [s.key]: e.target.value })}
                className="w-full rounded-lg border border-line p-[7px] text-ink"
              />
              {s.unit}
            </span>
          </label>
        ))}
      </div>
      <Button variant="primary" className="mt-3 w-full" onClick={startQuickStudy}>
        ابدأ المذاكرة
      </Button>
    </div>
  );
}

function TimerRunning() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  return (
    <div>
      <div className="mt-2 text-center font-semibold text-brand">{timerModeLabel(timer)}</div>
      <div className="text-center text-[52px] font-bold leading-[1.2] text-brand tabular-nums" role="timer">
        {formatClock(remainingMs(timer, now))}
      </div>
      <div className="min-h-[22px] text-center text-[13px] text-muted">
        {timer.mode === 'focus' ? `${timer.subject} · ${timer.topic}` : 'استرح قليلًا'}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button variant="primary" onClick={toggleTimerPause}>
          {timer.paused ? 'استئناف' : 'إيقاف مؤقت'}
        </Button>
        <Button onClick={stopPomodoro}>إنهاء</Button>
      </div>
      <MiniButton className="mt-2 text-brand" onClick={showTimerSetup}>
        إعداد المؤقت
      </MiniButton>
    </div>
  );
}

export function TimerDock() {
  const open = useTimerStore(s => s.dockOpen);
  const active = useTimerStore(s => s.timer.active);
  if (!open) return null;
  return (
    <aside
      aria-live="polite"
      aria-label="مؤقت بومودورو"
      className="fixed right-[18px] top-[120px] z-20 w-[min(310px,calc(100vw-24px))] rounded-[18px] border border-line bg-white p-4 shadow-float max-md:bottom-[10px] max-md:right-[10px] max-md:top-auto max-md:w-[min(340px,calc(100vw-20px))]"
    >
      <div className="mb-[13px] flex items-center justify-between">
        <strong className="flex items-center gap-1.5">
          <Icon name="timer" size={18} /> مؤقت بومودورو
        </strong>
        <MiniButton title="تصغير المؤقت" aria-label="تصغير المؤقت" onClick={minimizeTimer}>
          —
        </MiniButton>
      </div>
      {active ? <TimerRunning /> : <TimerSetup />}
    </aside>
  );
}

/** Floating pill shown while a round runs with the dock minimized. */
export function TimerMini() {
  const open = useTimerStore(s => s.dockOpen);
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  if (open || !timer.active) return null;
  return (
    <button
      type="button"
      onClick={showTimerDock}
      className="fixed right-[18px] top-[120px] z-20 rounded-3xl border-0 bg-brand px-4 py-3 font-semibold text-white shadow-[0_10px_28px_#162a2030] tabular-nums max-md:bottom-3 max-md:right-[10px] max-md:top-auto"
    >
      ⏱ <span>{formatClock(remainingMs(timer, now))}</span> · إظهار
    </button>
  );
}
