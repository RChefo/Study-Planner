import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/routes/paths';
import { useMinuteNow } from '@/features/insights/hooks';
import { cn } from '@/lib/cn';
import { NAV_GROUPS, SETTINGS, TODAY, type NavStation } from './navModel';
import { FocusAction, FocusPause } from './FocusAction';
import { useFocusState } from './useFocusState';
import { useTodayRemaining } from './useTodayRemaining';

/** Centre of the 76px icon column, where the path runs (logical, so it mirrors in RTL). */
const PATH_X = 'start-[calc(38px-0.5px)]';

/** Label that is a tooltip when the rail is compact, and plain text when it is expanded. */
function Label({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  if (expanded) return <span className="min-w-0 truncate">{children}</span>;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-brand-night px-2.5 py-1.5 text-xs font-medium text-dawn opacity-0 shadow-[0_10px_24px_-12px_#000] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

/** Station on the path: a round icon on the line, the label beside it (or as a tooltip). */
function Station({ station, expanded, icon, extra, ariaLabel }: { station: NavStation; expanded: boolean; icon?: ReactNode; extra?: ReactNode; ariaLabel?: string }) {
  return (
    <li>
      <NavLink
        to={station.to}
        end={station.end}
        aria-label={ariaLabel ?? (expanded ? undefined : station.label)}
        className={({ isActive }) =>
          cn(
            'group relative flex h-12 items-center text-[14px] no-underline outline-none transition-colors',
            isActive ? 'font-semibold text-dawn' : 'text-dawn/55 hover:text-dawn/90 focus-visible:text-dawn',
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* the "you are here" mark: a short lantern-gold line on the content-facing edge */}
            <span
              aria-hidden="true"
              className={cn('absolute end-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-s-full bg-[#f2c77e] transition-[opacity,transform] duration-300 motion-reduce:transition-none', isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0')}
            />
            <span className="grid w-[76px] shrink-0 place-items-center">
              <span
                className={cn(
                  'relative grid size-10 place-items-center rounded-full bg-brand-night transition-[background-color,box-shadow] duration-200 group-focus-visible:ring-2 group-focus-visible:ring-[#f2c77e]',
                  isActive ? 'bg-[#1d4a3c] shadow-[0_0_0_1px_#f4eee026]' : 'group-hover:bg-[#15392f]',
                )}
              >
                {icon ?? <Icon name={station.icon} size={19} />}
                {extra}
              </span>
            </span>
            <Label expanded={expanded}>{station.label}</Label>
          </>
        )}
      </NavLink>
    </li>
  );
}

/** Today is special: today's own date on the path, with a quiet count of what is left. */
function TodayStation({ expanded }: { expanded: boolean }) {
  const now = useMinuteNow();
  const remaining = useTodayRemaining();
  const day = new Date(now).getDate();
  const label = remaining.total ? `${TODAY.label} · ${remaining.total}` : TODAY.label;
  return (
    <Station
      station={{ ...TODAY, label }}
      expanded={expanded}
      ariaLabel={`${TODAY.label} — ${remaining.label}`}
      icon={
        <span aria-hidden="true" className="font-display text-[1.35rem] leading-none tabular-nums">
          {day}
        </span>
      }
      extra={remaining.total ? <span aria-hidden="true" className="absolute end-0.5 top-0.5 size-2 rounded-full bg-[#f2c77e] ring-2 ring-brand-night" /> : undefined}
    />
  );
}

/**
 * Desktop navigation: a slim night-green rail whose stations sit on a faint path — Today at
 * the top, then study, schedule and progress, ending in the Focus action. Labels are
 * tooltips (on hover AND keyboard focus) unless the student chooses to show them.
 */
export function Sidebar({ expanded, onToggleExpanded }: { expanded: boolean; onToggleExpanded: () => void }) {
  const focus = useFocusState();
  return (
    <nav aria-label="التنقل الرئيسي" className="flex h-full flex-col py-4 text-dawn">
      <Link to={ROUTES.app} aria-label="Study Planner — اليوم" className={cn('flex h-12 shrink-0 items-center rounded-xl no-underline', !expanded && 'justify-center')}>
        <span className={cn('grid shrink-0 place-items-center', expanded && 'w-[76px]')}>
          <BrandLogo size={34} priority />
        </span>
        {expanded && (
          <span dir="ltr" className="truncate text-[15px] font-bold tracking-tight text-dawn">
            Study Planner
          </span>
        )}
      </Link>

      <div className="relative mt-5">
        {/* the path the stations sit on, running down to Focus */}
        <span aria-hidden="true" className={cn('absolute bottom-8 top-6 w-px bg-[repeating-linear-gradient(to_bottom,#f4eee02e_0_4px,transparent_4px_10px)]', PATH_X)} />
        <ul className="relative m-0 list-none p-0">
          <TodayStation expanded={expanded} />
        </ul>
        {NAV_GROUPS.map(group => (
          <div key={group.id} role="group" aria-label={group.label} className="relative mt-3">
            {expanded && (
              <p aria-hidden="true" className="m-0 ms-[76px] mb-0.5 text-[11px] font-medium tracking-wide text-dawn/35">
                {group.label}
              </p>
            )}
            <ul className="m-0 list-none p-0">
              {group.stations.map(s => (
                <Station key={s.to} station={s} expanded={expanded} />
              ))}
            </ul>
          </div>
        ))}

        <div className={cn('relative mt-5 flex items-center', expanded ? '' : 'flex-col')}>
          <span className="grid w-[76px] shrink-0 place-items-center">
            <FocusAction />
          </span>
          {expanded ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-semibold text-dawn">{focus.active ? focus.label : 'جولة تركيز'}</span>
              <FocusPause />
            </span>
          ) : (
            <FocusPause className="mt-1.5" />
          )}
        </div>
      </div>

      <div className="flex-1" />
      <ul className="m-0 mt-4 list-none p-0">
        <Station station={SETTINGS} expanded={expanded} />
      </ul>
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-label={expanded ? 'إخفاء أسماء الأقسام' : 'إظهار أسماء الأقسام'}
        aria-pressed={expanded}
        className={cn('mt-1 hidden h-9 items-center gap-2 rounded-full text-[12px] text-dawn/45 transition-colors hover:text-dawn/80 xl:flex', expanded ? 'ms-[22px] px-2' : 'mx-auto w-9 justify-center')}
      >
        <Icon name={expanded ? 'chevron' : 'chevronNext'} size={15} />
        {expanded && 'إخفاء الأسماء'}
      </button>
    </nav>
  );
}
