import type { TimerSettings } from '@/types';
import { playAlarm } from '@/lib/audio';
import { notifyStudy } from '@/lib/notifications';
import { plannerData, usePlannerStore } from '@/stores/plannerStore';
import { timerState, useTimerStore, type TimerDraft } from '@/stores/timerStore';
import { toast } from '@/stores/uiStore';

/** Pomodoro behaviour. UI components call these; the engine (useTimerEngine) calls timerTick. */

const timer = () => useTimerStore.getState();

/** One log entry per focus round, identified by its start time (dedupes across tabs/retries). */
const focusLogId = (startedAt: number) => `focus-${startedAt}`;

export const SETTING_LIMITS = {
  focus: [1, 180, 25],
  shortBreak: [1, 60, 5],
  longBreak: [1, 90, 15],
  cycles: [2, 8, 4],
} as const satisfies Record<keyof TimerSettings, readonly [number, number, number]>;

/** Validates one setting; returns an error message or null. */
export function settingError(key: keyof TimerSettings, raw: string): string | null {
  const [min, max] = SETTING_LIMITS[key];
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value)) return 'أدخل رقمًا صحيحًا';
  if (value < min || value > max) return `بين ${min} و${max}`;
  return null;
}

export function clampSettings(draft: Pick<TimerDraft, keyof TimerSettings>): TimerSettings {
  const value = (key: keyof TimerSettings) => {
    const [min, max, def] = SETTING_LIMITS[key];
    return Math.max(min, Math.min(max, parseInt(draft[key], 10) || def));
  };
  return { focus: value('focus'), shortBreak: value('shortBreak'), longBreak: value('longBreak'), cycles: value('cycles') };
}

interface StartOptions {
  subject: string;
  topic: string;
  courseId?: string | null;
}

function begin({ subject, topic, courseId = null }: StartOptions): boolean {
  const t = timerState();
  if (t.active) {
    toast('هناك جولة جارية بالفعل؛ أنهِها أولًا');
    return false;
  }
  const cfg = clampSettings(timer().draft);
  const now = Date.now();
  timer().setTimer({
    ...cfg,
    active: true,
    paused: false,
    mode: 'focus',
    startedAt: now,
    endsAt: now + cfg.focus * 60000,
    subject: subject || 'مذاكرة عامة',
    topic: topic.trim() || 'مذاكرة حرة',
    courseId,
    sessionId: null,
    completed: t.completed || 0,
    remainingMs: undefined,
    lastCompleted: null,
  });
  playAlarm('start');
  return true;
}

/** Starts a round from the timer page form (course + lecture/topic chosen in the draft). */
export function startFromDraft(): boolean {
  const { draft } = timer();
  const course = plannerData().courses.find(c => c.id === draft.courseId);
  return begin({ subject: course?.name ?? 'مذاكرة عامة', topic: draft.topic, courseId: course?.id ?? null });
}

/** Starts a round for a specific lecture (from course pages and the dashboard). */
export function startLectureStudy(courseId: string, index: number): boolean {
  const course = plannerData().courses.find(c => c.id === courseId);
  const lecture = course?.topics?.[index];
  if (!course || !lecture) return false;
  timer().setDraft({ courseId, topic: lecture.name });
  return begin({ subject: course.name, topic: lecture.name, courseId });
}

export function toggleTimerPause() {
  const t = timerState();
  if (!t.active) return;
  if (t.paused) {
    timer().setTimer({ paused: false, endsAt: Date.now() + (t.remainingMs ?? 0), remainingMs: undefined });
    playAlarm('start');
  } else {
    timer().setTimer({ paused: true, remainingMs: Math.max(0, t.endsAt - Date.now()) });
  }
}

/** Focus milliseconds spent in the current round (pause-aware). */
function focusElapsedMs(now: number): number {
  const t = timerState();
  if (!t.active || t.mode !== 'focus') return 0;
  const remaining = t.paused ? (t.remainingMs ?? 0) : Math.max(0, t.endsAt - now);
  return Math.max(0, t.focus * 60000 - remaining);
}

/** Whole minutes that would be saved if the round were stopped now. */
export function focusMinutesSoFar(now = Date.now()): number {
  return Math.round(focusElapsedMs(now) / 60000);
}

/** Ends the round. Focus time of 30 s or more is saved to the study log. */
export function stopPomodoro() {
  const t = timerState();
  const elapsedMs = focusElapsedMs(Date.now());
  let saved = 0;
  if (t.active && t.mode === 'focus' && elapsedMs >= 30_000) {
    saved = Math.max(1, Math.round(elapsedMs / 60000));
    void usePlannerStore.getState().addStudyLog({
      id: focusLogId(t.startedAt),
      subject: t.subject,
      topic: t.topic,
      startedAt: t.startedAt,
      endedAt: Date.now(),
      duration: saved,
      completed: false,
      sessionId: t.sessionId,
    });
  }
  timer().setTimer({ active: false, paused: false, endsAt: 0, mode: 'focus', remainingMs: undefined });
  timer().resetDraftSettings();
  toast(saved ? `تم إيقاف المؤقت وحفظ ${saved} دقيقة في سجل المذاكرة` : 'تم إيقاف المؤقت');
}

/** Ends a break early and returns to idle. */
export function skipBreak() {
  const t = timerState();
  if (!t.active || t.mode === 'focus') return;
  timer().setTimer({ active: false, paused: false, mode: 'focus', endsAt: 0, startedAt: 0, remainingMs: undefined });
  timer().resetDraftSettings();
}

export function dismissCompletion() {
  timer().setTimer({ lastCompleted: null });
}

/** Runs every 500 ms in the leader tab while a round is active: focus → break → idle. */
export function timerTick() {
  const t = timerState();
  if (!t.active || t.paused) return;
  const now = Date.now();
  if (t.endsAt - now > 0) {
    timer().setNow(now);
    return;
  }
  if (t.mode === 'focus') {
    const minutes = Math.max(1, Math.round((now - t.startedAt) / 60000));
    void usePlannerStore.getState().addStudyLog({
      id: focusLogId(t.startedAt),
      subject: t.subject,
      topic: t.topic,
      startedAt: t.startedAt,
      endedAt: now,
      duration: minutes,
      completed: true,
      sessionId: t.sessionId,
    });
    const completed = (t.completed || 0) + 1;
    notifyStudy('انتهت جلسة التركيز. خذ استراحة قصيرة.');
    playAlarm('break');
    const mode = completed % t.cycles === 0 ? 'longBreak' : 'shortBreak';
    timer().setTimer({
      completed,
      mode,
      startedAt: now,
      endsAt: now + (mode === 'longBreak' ? t.longBreak : t.shortBreak) * 60000,
      sessionId: null,
      lastCompleted: { subject: t.subject, topic: t.topic, courseId: t.courseId ?? null, minutes, endedAt: now },
    });
    toast(mode === 'longBreak' ? 'أحسنت! حان وقت الاستراحة الطويلة' : 'أحسنت! حان وقت الاستراحة', 'success');
  } else {
    notifyStudy('انتهت الاستراحة. جاهز لجولة مذاكرة جديدة؟');
    playAlarm('ready');
    timer().setTimer({ active: false, mode: 'focus', endsAt: 0, startedAt: 0 });
    timer().resetDraftSettings();
    toast('انتهت الاستراحة؛ ابدأ جولة جديدة وقتما تحب');
  }
}
