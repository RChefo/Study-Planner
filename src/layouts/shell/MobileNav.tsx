import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { useMinuteNow } from '@/features/insights/hooks';
import { cn } from '@/lib/cn';
import { SyncIndicator } from './SyncIndicator';
import { FocusAction } from './FocusAction';
import { NAV_GROUPS, SETTINGS, TODAY, type NavStation } from './navModel';
import { useTodayRemaining } from './useTodayRemaining';

const COURSES = NAV_GROUPS[0].stations[0];
const TIMETABLE = NAV_GROUPS[1].stations[0];
/** Everything not in the dock, in workflow order (commitments first: it's the most time-sensitive). */
const MORE_GROUPS = [
  { label: 'المواعيد', stations: NAV_GROUPS[1].stations.slice(1) },
  { label: 'التقدّم', stations: NAV_GROUPS[2].stations },
  { label: 'النظام', stations: [SETTINGS] },
];
const MORE_PATHS = MORE_GROUPS.flatMap(g => g.stations.map(s => s.to));

function DockItem({ to, end, label, ariaLabel, icon }: { to: string; end?: boolean; label: string; ariaLabel?: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={ariaLabel}
      className={({ isActive }) =>
        cn('relative flex h-full flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] no-underline transition-colors', isActive ? 'font-semibold text-dawn' : 'text-dawn/55 active:text-dawn')
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden="true" className={cn('absolute top-1 size-1 rounded-full bg-[#f2c77e] transition-opacity duration-200', isActive ? 'opacity-100' : 'opacity-0')} />
          {icon}
          {label}
        </>
      )}
    </NavLink>
  );
}

/**
 * Phone/tablet navigation: a floating night-green dock centred on Today and Focus — Today
 * (with today's date), Courses, a raised Focus action, Schedule, and "More" for the rest.
 */
export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const now = useMinuteNow();
  const remaining = useTodayRemaining();
  const inMore = MORE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <>
      <nav
        aria-label="التنقل"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-[440px] rounded-[26px] bg-brand-night shadow-[0_18px_40px_-18px_#0c2f26cc] lg:hidden"
      >
        <ul className="m-0 grid h-16 list-none grid-cols-5 items-center p-0 px-1">
          <li className="h-full">
            <DockItem
              to={TODAY.to}
              end
              label={TODAY.label}
              ariaLabel={`${TODAY.label} — ${remaining.label}`}
              icon={
                <span aria-hidden="true" className="relative font-display text-[1.2rem] leading-none tabular-nums">
                  {new Date(now).getDate()}
                  {remaining.total > 0 && <span className="absolute -end-2 -top-0.5 size-1.5 rounded-full bg-[#f2c77e]" />}
                </span>
              }
            />
          </li>
          <li className="h-full">
            <DockItem to={COURSES.to} label={COURSES.label} icon={<Icon name={COURSES.icon} size={19} />} />
          </li>
          <li className="grid h-full place-items-center">
            {/* The primary action, lifted out of the dock. */}
            <FocusAction size={56} className="-mt-7 ring-4 ring-paper" />
          </li>
          <li className="h-full">
            <DockItem to={TIMETABLE.to} label={TIMETABLE.label} icon={<Icon name={TIMETABLE.icon} size={19} />} />
          </li>
          <li className="h-full">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn('relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] transition-colors', inMore ? 'font-semibold text-dawn' : 'text-dawn/55')}
            >
              <span aria-hidden="true" className={cn('absolute top-1 size-1 rounded-full bg-[#f2c77e]', inMore ? 'opacity-100' : 'opacity-0')} />
              <Icon name="more" size={19} />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="المزيد" className="lg:hidden">
        <div className="space-y-5">
          {MORE_GROUPS.map(group => (
            <div key={group.label} role="group" aria-label={group.label}>
              <p aria-hidden="true" className="m-0 mb-1.5 px-3 text-[11px] font-semibold text-muted">
                {group.label}
              </p>
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {group.stations.map((item: NavStation) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn('flex h-12 items-center gap-3 rounded-2xl px-3 text-[15px] no-underline transition-colors', isActive ? 'bg-brand-soft font-semibold text-brand-night' : 'text-ink hover:bg-stripe')
                      }
                    >
                      <Icon name={item.icon} size={19} className="text-brand" />
                      {item.label}
                      <Icon name="chevronNext" size={16} className="ms-auto text-muted" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-line pt-3">
          <SyncIndicator />
        </div>
      </Dialog>
    </>
  );
}
