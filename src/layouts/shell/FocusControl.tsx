import { Link, useLocation } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useTimerStore } from '@/stores/timerStore';
import { ROUTES } from '@/routes/paths';
import { toggleTimerPause } from '@/features/timer/timerController';
import { langOf } from '@/lib/text';
import { useFocusState } from './useFocusState';

function Ring({ fraction, stroke }: { fraction: number; stroke: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
        className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
  );
}

/**
 * Focus is an action, not a place: a small floating control in the reading-end corner.
 * Idle, it invites a round; running, it becomes a mini player (ring, time, what you're
 * studying, pause/resume). Hidden in focus mode itself, which already shows all of this.
 */
export function FocusControl() {
  const { pathname } = useLocation();
  const s = useFocusState();
  const subject = useTimerStore(st => st.timer.subject);
  if (pathname === ROUTES.timer) return null;

  // Phones: float just above the journey footer (≈76px + safe area); desktop: the corner.
  const base = 'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-40 lg:bottom-6 lg:end-6 motion-safe:animate-enter';

  if (!s.active) {
    return (
      <Link
        to={ROUTES.timer}
        aria-label="ابدأ جولة تركيز"
        className={cn(
          base,
          'group inline-flex h-12 items-center gap-2 rounded-full bg-brand-night ps-3 pe-4 text-sm font-semibold text-dawn no-underline shadow-[0_14px_30px_-14px_#0c2f26] transition-[background-color,transform] duration-200 hover:bg-brand-deep active:scale-[0.97] focus-visible:outline-[#c19a4f]',
        )}
      >
        <span className="grid size-7 place-items-center rounded-full bg-dawn text-brand-night transition-transform duration-300 group-hover:rotate-[-8deg]">
          <Icon name="timer" size={15} />
        </span>
        تركيز
      </Link>
    );
  }

  const warm = !s.focus;
  return (
    <div
      role="group"
      aria-label="الجولة الجارية"
      className={cn(
        base,
        'flex h-14 items-center gap-1 rounded-full py-1.5 ps-1.5 pe-2 shadow-[0_16px_36px_-16px_#0c2f26]',
        warm ? 'bg-[#f6ead4] text-[#5e3a0e]' : 'bg-brand-night text-dawn',
      )}
    >
      <Link
        to={ROUTES.timer}
        aria-label={s.aria}
        className="flex min-w-0 items-center gap-2.5 rounded-full pe-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#c19a4f]"
      >
        <span className={cn('relative grid size-11 shrink-0 place-items-center rounded-full', warm ? 'bg-white/60' : 'bg-white/10')}>
          <Ring fraction={s.fraction} stroke={warm ? 'var(--color-accent)' : '#8fd6b3'} />
          <Icon name={warm ? 'coffee' : 'timer'} size={15} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span dir="ltr" className={cn('text-end text-[15px] font-bold tabular-nums rtl:text-right', s.paused && 'opacity-60')}>
            {s.clock}
          </span>
          <span lang={langOf(subject)} className="max-w-36 truncate text-[11px] opacity-70 max-sm:max-w-24">
            {s.paused ? 'متوقفة مؤقتًا' : warm ? s.label : subject}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={toggleTimerPause}
        aria-label={s.paused ? 'استئناف المؤقت' : 'إيقاف المؤقت مؤقتًا'}
        className={cn('grid size-10 shrink-0 place-items-center rounded-full transition-colors', warm ? 'hover:bg-white/60' : 'hover:bg-white/10')}
      >
        <Icon name={s.paused ? 'play' : 'pause'} size={16} />
      </button>
    </div>
  );
}
