import { NavLink } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useTimerStore } from '@/stores/timerStore';
import { ROUTES } from '@/routes/paths';
import { toggleTimerPause } from '@/features/timer/timerController';
import { useFocusState } from './useFocusState';

/** Thin progress ring drawn around the focus button while a round runs. */
function Ring({ fraction, tone, size }: { fraction: number; tone: string; size: number }) {
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0 size-full -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

/**
 * The primary action of the navigation: a dawn-coloured disc that opens focus mode. While a
 * round runs it becomes a small live clock with a progress ring (warm during breaks).
 */
export function FocusAction({ size = 52, showLabel = false, className }: { size?: number; showLabel?: boolean; className?: string }) {
  const s = useFocusState();
  return (
    <NavLink
      to={ROUTES.timer}
      aria-label={s.aria}
      className={({ isActive }) =>
        cn(
          'group relative grid shrink-0 place-items-center rounded-full no-underline shadow-[0_10px_24px_-12px_#000000aa] transition-[transform,background-color] duration-200 active:scale-95',
          s.active && !s.focus ? 'bg-[#f6ead4] text-[#6b3f0c]' : 'bg-dawn text-brand-night hover:bg-white',
          isActive && 'outline outline-2 outline-offset-[3px] outline-[#f2c77e]',
          className,
        )
      }
      style={{ width: size, height: size }}
    >
      {s.active && <Ring fraction={s.fraction} tone={s.focus ? '#2e9e6f' : 'var(--color-accent)'} size={size} />}
      {s.active ? (
        <span dir="ltr" className={cn('text-[12px] font-bold tabular-nums tracking-tight', s.paused && 'opacity-50')}>
          {s.clock}
        </span>
      ) : (
        <Icon name="timer" size={Math.round(size * 0.42)} />
      )}
      {showLabel && <span className="sr-only">{s.label}</span>}
    </NavLink>
  );
}

/** Small pause/resume control shown next to the focus action while a round runs. */
export function FocusPause({ className }: { className?: string }) {
  const active = useTimerStore(s => s.timer.active);
  const paused = useTimerStore(s => s.timer.paused);
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={toggleTimerPause}
      aria-label={paused ? 'استئناف المؤقت' : 'إيقاف المؤقت مؤقتًا'}
      className={cn('grid size-7 place-items-center rounded-full text-dawn/70 transition-colors hover:bg-white/10 hover:text-dawn', className)}
    >
      <Icon name={paused ? 'play' : 'pause'} size={13} />
    </button>
  );
}
