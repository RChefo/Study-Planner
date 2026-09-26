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

/**
 * Phones and tablets: "where am I on the path". The header shows the current station and a
 * miniature of the path (a dot per station, gold where you are); tapping opens the whole
 * path as a vertical journey. Every destination is one tap away.
 */
export function JourneyNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = stationIndex(pathname);
  const now = useMinuteNow();
  const remaining = useTodayRemaining();
  const here = current >= 0 ? STATIONS[current] : pathname.startsWith(SETTINGS.to) ? SETTINGS : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`مسار الدراسة — أنت في ${here?.label ?? 'وضع التركيز'}`}
        className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl px-2 py-1 text-start outline-none transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-[#c19a4f]"
      >
        <span className="flex items-center gap-1 text-[15px] font-semibold text-brand-night">
          {here?.label ?? 'وضع التركيز'}
          <Icon name="chevronDown" size={15} className="text-muted" />
        </span>
        {/* the path in miniature */}
        <span aria-hidden="true" className="flex items-center">
          {STATIONS.map((s, i) => (
            <span key={s.to} className="flex items-center">
              {i > 0 && <span className={cn('h-px w-3', i <= current ? 'bg-[#c19a4f]' : 'bg-[repeating-linear-gradient(to_left,#b3c2b9_0_2px,transparent_2px_4px)]')} />}
              <span
                className={cn('rounded-full', i === current ? 'size-2 bg-[#e0a94f] shadow-[0_0_0_2px_#f2c77e55]' : i < current ? 'size-1.5 bg-[#c19a4f]' : 'size-1.5 bg-[#b3c2b9]')}
              />
            </span>
          ))}
        </span>
      </button>

      {/* Portalled: the header is sticky with a backdrop filter, which would trap a fixed overlay. */}
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
