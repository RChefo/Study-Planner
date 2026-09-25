import type { TimerSettings } from '@/types';
import { playAlarm } from '@/lib/audio';
import { notifyStudy } from '@/lib/notifications';
import { uid } from '@/lib/id';
import { plannerData, usePlannerStore } from '@/stores/plannerStore';
import { timerState, useTimerStore, type TimerDraft } from '@/stores/timerStore';
import { toast } from '@/stores/uiStore';

/** Pomodoro behaviour ported from the original page; UI components call these. */

const timer = () => useTimerStore.getState();

function clampSettings(draft: TimerDraft): TimerSettings {
  const value = (raw: string, def: number, min: number, max: number) => Math.max(min, Math.min(max, parseInt(raw, 10) || def));
  return {
    focus: value(draft.focus, 25, 1, 180),
    shortBreak: value(draft.shortBreak, 5, 1, 60),
    longBreak: value(draft.longBreak, 15, 1, 90),
    cycles: value(draft.cycles, 4, 2, 8),
  };
}

export const showTimerDock = () => timer().setDockOpen(true);
export const minimizeTimer = () => timer().setDockOpen(false);

export function showTimerSetup() {
  if (timerState().active) return toast('أوقف المؤقت قبل تغيير الإعدادات');
  showTimerDock();
}

/** Called once the auth gate closes: bring back a round that was running before reload. */
export function resumeRunningTimer() {
  const t = timerState();
  if (t.active && !t.paused) showTimerDock();
}

export function startQuickStudy() {
  const t = timerState();
  if (t.active) return toast('أوقف المؤقت الحالي قبل بدء جولة جديدة');
  const { draft } = timer();
  const cfg = clampSettings(draft);
  const course = plannerData().courses.find(c => c.id === draft.courseId);
  const now = Date.now();
  timer().setTimer({
    ...cfg,
    active: true,
    paused: false,
    mode: 'focus',
    startedAt: now,
    endsAt: now + cfg.focus * 60000,
    subject: course?.name || 'مذاكرة عامة',
    topic: draft.topic.trim() || 'مذاكرة حرة',
    sessionId: null,
    completed: t.completed || 0,
  });
  playAlarm('start');
  toast('بدأ وقت التركيز. بالتوفيق!');
}

export function startLectureStudy(courseId: string, index: number) {
  const lecture = plannerData().courses.find(c => c.id === courseId)?.topics?.[index];
  if (!lecture) return;
  showTimerDock();
  timer().setDraft({ courseId, topic: lecture.name });
  startQuickStudy();
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

export function stopPomodoro() {
  const t = timerState();
  if (t.active && t.mode === 'focus') {
    const elapsed = Math.max(0, Math.floor((Date.now() - t.startedAt) / 1000));
    if (elapsed >= 30) {
      void usePlannerStore.getState().addStudyLog({
        id: uid(),
        subject: t.subject,
        topic: t.topic,
        startedAt: t.startedAt,
        endedAt: Date.now(),
        duration: Math.max(1, Math.round(elapsed / 60)),
        completed: false,
        sessionId: t.sessionId,
      });
    }
  }
  timer().setTimer({ active: false, paused: false, endsAt: 0 });
  timer().resetDraftSettings();
  toast('تم إيقاف المؤقت وحفظ الوقت الذي ذاكرته');
}

/** Runs every 500 ms while a round is active: advances focus → break → idle. */
export function timerTick() {
  const t = timerState();
  if (!t.active || t.paused) return;
  const now = Date.now();
  if (t.endsAt - now > 0) {
    timer().setNow(now);
    return;
  }
  if (t.mode === 'focus') {
    void usePlannerStore.getState().addStudyLog({
      id: uid(),
      subject: t.subject,
      topic: t.topic,
      startedAt: t.startedAt,
      endedAt: now,
      duration: Math.max(1, Math.round((now - t.startedAt) / 60000)),
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
    });
    toast(mode === 'longBreak' ? 'أحسنت! حان وقت الاستراحة الطويلة' : 'أحسنت! حان وقت الاستراحة');
  } else {
    notifyStudy('انتهت الاستراحة. جاهز لجولة مذاكرة جديدة؟');
    playAlarm('ready');
    timer().setTimer({ active: false, mode: 'focus', endsAt: 0, startedAt: 0 });
    timer().resetDraftSettings();
    toast('انتهت الاستراحة؛ ابدأ جولة جديدة وقتما تحب');
  }
}
