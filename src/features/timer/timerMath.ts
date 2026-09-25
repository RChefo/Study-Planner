import type { PlannerData, TimerState } from '@/types';
import { dateKey } from '@/lib/dates';

export function remainingMs(timer: TimerState, now: number): number {
  return Math.max(0, timer.paused ? (timer.remainingMs ?? 0) : timer.endsAt - now);
}

/** Logged focus minutes for today plus the running focus round, if any. */
export function todayStudyMinutes(data: PlannerData, timer: TimerState, now: number): number {
  const today = dateKey(now);
  let ms = data.studyLog.filter(l => dateKey(l.startedAt) === today).reduce((n, l) => n + (Number(l.duration) || 0) * 60000, 0);
  if (timer.active && timer.mode === 'focus') {
    const total = (Number(timer.focus) || 25) * 60000;
    ms += Math.max(0, total - remainingMs(timer, now));
  }
  return Math.floor(ms / 60000);
}

export function timerModeLabel(timer: TimerState): string {
  if (timer.paused) return 'متوقف مؤقتًا';
  if (timer.mode === 'focus') return 'وقت التركيز';
  return timer.mode === 'longBreak' ? 'استراحة طويلة' : 'استراحة قصيرة';
}
