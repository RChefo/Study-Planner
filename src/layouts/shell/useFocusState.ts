import { formatClock } from '@/lib/dates';
import { useTimerStore } from '@/stores/timerStore';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';

/** Live state of the pomodoro for the navigation (real timer data only). */
export function useFocusState() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  if (!timer.active) return { active: false as const, label: 'تركيز', aria: 'ابدأ جولة تركيز' };
  const focus = timer.mode === 'focus';
  const total = (focus ? timer.focus : timer.mode === 'longBreak' ? timer.longBreak : timer.shortBreak) * 60000;
  const remaining = remainingMs(timer, now);
  const clock = formatClock(remaining);
  return {
    active: true as const,
    focus,
    paused: timer.paused,
    clock,
    fraction: total ? (total - remaining) / total : 0,
    label: focus ? 'تركيز' : 'استراحة',
    aria: `${timerModeLabel(timer)}: ${clock} متبقية — فتح وضع التركيز`,
  };
}
