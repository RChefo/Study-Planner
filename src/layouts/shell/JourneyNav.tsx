import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { useMinuteNow } from '@/features/insights/hooks';
import { cn } from '@/lib/cn';
import { GROUP_LABEL, GROUP_ORDER, SETTINGS, STATIONS, stationIndex } from './navModel';
import { SyncIndicator } from './SyncIndicator';
import { useTodayRemaining } from './useTodayRemaining';

const LAST = STATIONS.length - 1;

/**
 * Phones and tablets: the study path, always visible under the page title — every station
 * is a small stop you can tap, the stretch behind you is gold, the stretch ahead is dashed,
 * and where you are is dark with a gold halo and named. The detailed sheet (with labels
 * and groups) is an extra, opened from the button at the end of the path.
 */
export function JourneyNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = stationIndex(pathname);
  const now = useMinuteNow();
  const remaining = useTodayRemaining();

  return (
    <>
      <div className="flex max-w-[440px] items-start gap-2 pb-5">
        <ol aria-label="مسار الدراسة" className="relative m-0 flex min-w-0 flex-1 list-none items-center justify-between p-0">
          {/* the path: dashed ahead, gold behind you */}
          <span aria-hidden="true" className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(to_left,#b3c2b9_0_3px,transparent_3px_7px)]" />
          <span
            aria-hidden="true"
            className="absolute start-5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#c19a4f] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: current > 0 ? `calc((100% - 40px) * ${current / LAST})` : 0 }}
          />
          {STATIONS.map((s, i) => {
            const home = s.weight === 'home';
            const here = i === current;
            return (
              <li key={s.to} className="relative z-10">
                <NavLink
                  to={s.to}
                  end={s.end}
                  aria-label={home ? `${s.label} — ${remaining.label}` : s.label}
                  className="grid size-10 place-items-center rounded-full no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#c19a4f]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative grid place-items-center rounded-full transition-[background-color,box-shadow,color] duration-300',
                      home ? 'size-8 font-display text-[15px] leading-none tabular-nums' : 'size-7',
                      here
                        ? 'bg-brand-night text-dawn shadow-[0_0_0_4px_#f2c77e55,0_0_12px_#e9b87280]'
                        : i < current
                          ? 'bg-[#f6ecd6] text-[#8a6420] shadow-[0_0_0_1px_#c19a4f]'
                          : 'bg-paper text-subtle shadow-[0_0_0_1px_#b3c2b9]',
                    )}
                  >
                    {home ? new Date(now).getDate() : <Icon name={s.icon} size={14} />}
                    {home && remaining.total > 0 && <span className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-[#e0a94f] ring-2 ring-paper" />}
                  </span>
                </NavLink>
                {here && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-full mt-0.5 whitespace-nowrap text-[11px] font-semibold text-brand-night',
                      i === 0 ? 'start-0' : i === LAST ? 'end-0' : 'start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
                    )}
                  >
                    {s.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="عرض المسار كاملًا بالأسماء"
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-subtle outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-[#c19a4f]"
        >
          <Icon name="more" size={18} />
        </button>
      </div>

      {/* Portalled so the sheet always overlays the whole app, whatever contains the path. */}
      {createPortal(
        <Dialog open={open} onClose={() => setOpen(false)} title="مسارك الدراسي" description="من اليوم إلى تقدّمك — اختر محطتك.">
          <ol className="relative m-0 list-none p-0">
            <span aria-hidden="true" className="absolute bottom-6 start-[19px] top-6 w-px bg-[repeating-linear-gradient(to_bottom,#b3c2b9_0_3px,transparent_3px_8px)]" />
            {GROUP_ORDER.map(group => (
              <li key={group} className="relative">
                {group !== 'today' && (
                  <p aria-hidden="true" className="m-0 mb-0.5 mt-3 ps-12 text-[11px] font-medium tracking-wide text-muted">
                    {GROUP_LABEL[group]}
                  </p>
                )}
                <ol aria-label={group === 'today' ? undefined : GROUP_LABEL[group]} className="m-0 list-none p-0">
                  {STATIONS.filter(s => s.group === group).map(s => {
                    const i = STATIONS.indexOf(s);
                    const home = s.weight === 'home';
                    return (
                      <li key={s.to}>
                        <NavLink
                          to={s.to}
                          end={s.end}
                          onClick={() => setOpen(false)}
                          aria-label={home ? `${s.label} — ${remaining.label}` : undefined}
                          className={({ isActive }) =>
                            cn(
                              'flex min-h-12 items-center gap-3 rounded-2xl pe-3 text-[15px] no-underline transition-colors',
                              isActive ? 'bg-brand-soft font-semibold text-brand-night' : 'text-ink hover:bg-stripe',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span className="grid w-10 shrink-0 place-items-center">
                                {home ? (
                                  <span
                                    className={cn(
                                      'grid size-9 place-items-center rounded-full font-display text-lg leading-none tabular-nums',
                                      isActive ? 'bg-brand-night text-dawn' : 'bg-white text-brand-night shadow-[0_0_0_1px_#0c2f261f]',
                                    )}
                                  >
                                    {new Date(now).getDate()}
                                  </span>
                                ) : (
                                  <span
                                    className={cn(
                                      'rounded-full',
                                      isActive
                                        ? 'size-3.5 bg-[#e0a94f] shadow-[0_0_0_4px_#f2c77e40]'
                                        : i < current
                                          ? 'size-2.5 bg-[#c19a4f]'
                                          : 'size-2.5 border-2 border-[#b3c2b9] bg-paper',
                                    )}
                                  />
                                )}
                              </span>
                              <Icon name={s.icon} size={17} className={isActive ? 'text-brand' : 'text-subtle'} />
                              <span className="flex-1">{s.label}</span>
                              {home && remaining.total > 0 && <span className="text-xs font-normal text-[#a2742a]">{remaining.total} متبقٍّ</span>}
                              {isActive && <span className="text-[11px] font-medium text-[#a2742a]">أنت هنا</span>}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
            <NavLink
              to={SETTINGS.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm no-underline transition-colors',
                  isActive ? 'bg-brand-soft font-semibold text-brand-night' : 'text-ink hover:bg-stripe',
                )
              }
            >
              <Icon name="settings" size={16} className="text-subtle" /> {SETTINGS.label}
            </NavLink>
            <SyncIndicator />
          </div>
        </Dialog>,
        document.body,
      )}
    </>
  );
}
