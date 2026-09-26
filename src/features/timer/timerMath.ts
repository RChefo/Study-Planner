import type { TimerState } from '@/types';

export function remainingMs(timer: TimerState, now: number): number {
  return Math.max(0, timer.paused ? (timer.remainingMs ?? 0) : timer.endsAt - now);
}

export function timerModeLabel(timer: TimerState): string {
  if (timer.paused) return 'متوقف مؤقتًا';
  if (timer.mode === 'focus') return 'وقت التركيز';
  return timer.mode === 'longBreak' ? 'استراحة طويلة' : 'استراحة قصيرة';
}
