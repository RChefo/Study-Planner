import { Link } from 'react-router';
import { useTimerStore } from '@/stores/timerStore';
import { formatClock } from '@/lib/dates';
import { Icon } from '@/components/ui/Icon';
import { remainingMs, timerModeLabel } from '@/features/timer/timerMath';
import { toggleTimerPause } from '@/features/timer/timerController';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';

/** Compact running-timer control in the top bar (visible on every page while a round runs). */
export function TimerChip() {
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  if (!timer.active) return null;
  const focus = timer.mode === 'focus';
  const clock = formatClock(remainingMs(timer, now));
  return (
    <div className={cn('flex h-9 items-center overflow-hidden rounded-lg border', focus ? 'border-[#cfe3d6] bg-mint text-brand' : 'border-[#f1dcc2] bg-[#fff6ea] text-[#8a4a12]')}>
      <Link to={ROUTES.timer} className="flex h-full items-center gap-1.5 px-2.5 text-[13px] font-semibold no-underline" aria-label={`${timerModeLabel(timer)}: ${clock} متبقية — فتح المؤقت`}>
        <Icon name={focus ? 'timer' : 'coffee'} size={15} />
        <span className="tabular-nums" dir="ltr">
          {clock}
        </span>
      </Link>
      <button
        type="button"
        onClick={toggleTimerPause}
        aria-label={timer.paused ? 'استئناف المؤقت' : 'إيقاف المؤقت مؤقتًا'}
        className="grid h-full w-8 place-items-center border-s border-current/15 transition-colors hover:bg-black/5"
      >
        <Icon name={timer.paused ? 'play' : 'pause'} size={14} />
      </button>
    </div>
  );
}
