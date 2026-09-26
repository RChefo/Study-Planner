import { Link } from 'react-router';
import { useTimerStore } from '@/stores/timerStore';
import { formatClock } from '@/lib/dates';
import { Icon } from '@/components/ui/Icon';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';
import { toggleTimerPause } from '@/features/timer/timerController';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';

/**
 * Top-bar focus control. Idle: a quiet "focus" shortcut to the timer. Running: the live
 * clock (links to focus mode) with pause/resume.
 */
export function TimerChip({ compact = false }: { compact?: boolean }) {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);

  if (!timer.active) {
    return (
      <Link
        to={ROUTES.timer}
        aria-label={compact ? 'جولة تركيز' : undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-subtle no-underline transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <Icon name="timer" size={16} />
        {!compact && 'جولة تركيز'}
      </Link>
    );
  }

  const focus = timer.mode === 'focus';
  const clock = formatClock(remainingMs(timer, now));
  return (
    <div className={cn('flex h-9 items-center overflow-hidden rounded-full', focus ? 'bg-brand-night text-dawn' : 'bg-[#fbf0dc] text-[#7c4e0e]')}>
      <Link to={ROUTES.timer} className="flex h-full items-center gap-2 ps-3 pe-2 text-[13px] font-semibold no-underline" aria-label={`${timerModeLabel(timer)}: ${clock} متبقية — فتح وضع التركيز`}>
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', timer.paused ? 'bg-current opacity-50' : focus ? 'bg-[#8fd6b3] motion-safe:animate-pulse' : 'bg-current')} />
        <span className="tabular-nums" dir="ltr">
          {clock}
        </span>
      </Link>
      <button
        type="button"
        onClick={toggleTimerPause}
        aria-label={timer.paused ? 'استئناف المؤقت' : 'إيقاف المؤقت مؤقتًا'}
        className="grid h-full w-9 place-items-center border-s border-current/15 transition-colors hover:bg-white/10"
      >
        <Icon name={timer.paused ? 'play' : 'pause'} size={14} />
      </button>
    </div>
  );
}
