import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useMinuteNow } from '@/features/insights/hooks';
import { cn } from '@/lib/cn';
import { GROUP_LABEL, GROUP_ORDER, STATIONS, stationIndex } from './navModel';
import { smoothPath, withLeads, type Pt } from './pathGeometry';
import { useTodayRemaining } from './useTodayRemaining';

/** Gentle rises and dips so the line reads as a walked path, not a ruler. */
const LIFT = [0, -4, 3, -3, 4, -2];

/**
 * The path remounts with each page (it lives under the page title), so the last station is
 * remembered here: the traveller then walks from where you were to where you are.
 */
let lastStation = -1;

/**
 * Desktop wayfinding: the study path itself. Stations are real links; the drawn line (solid
 * gold up to where you are, dashed beyond) and the gold traveller are decorative and are
 * measured from the stations, so they follow any width, font or direction.
 */
export function StudyPath() {
  const { pathname } = useLocation();
  const current = stationIndex(pathname);
  const now = useMinuteNow();
  const remaining = useTodayRemaining();
  const boxRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [geo, setGeo] = useState<{
    pts: Pt[];
    w: number;
    h: number;
    rtl: boolean;
  }>({ pts: [], w: 0, h: 0, rtl: true });
  const [shown, setShown] = useState(() => (lastStation >= 0 ? lastStation : current));

  useEffect(() => {
    lastStation = current;
    if (!geo.pts.length) return;
    const id = requestAnimationFrame(() => setShown(current));
    return () => cancelAnimationFrame(id);
  }, [current, geo.pts.length]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      const pts = dotRefs.current.map(el => {
        const r = el?.getBoundingClientRect();
        return r
          ? {
              x: r.left + r.width / 2 - b.left,
              y: r.top + r.height / 2 - b.top,
            }
          : { x: 0, y: 0 };
      });
      setGeo({
        pts,
        w: b.width,
        h: b.height,
        rtl: getComputedStyle(box).direction === 'rtl',
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [current]);

  const full = geo.pts.length ? smoothPath(withLeads(geo.pts, geo.w, geo.rtl)) : '';
  const walked = shown > 0 && geo.pts.length ? smoothPath(withLeads(geo.pts, geo.w, geo.rtl).slice(0, shown + 2)) : '';
  const here = shown >= 0 ? geo.pts[shown] : undefined;
  const today = new Date(now).getDate();

  return (
    <div ref={boxRef} data-tour="path" className="relative w-full max-w-[760px]">
      <svg aria-hidden="true" width={geo.w} height={geo.h} className="pointer-events-none absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id="sp-fade" x1="0" x2={geo.w} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8ea598" stopOpacity="0" />
            <stop offset="0.05" stopColor="#8ea598" stopOpacity="0.9" />
            <stop offset="0.95" stopColor="#8ea598" stopOpacity="0.9" />
            <stop offset="1" stopColor="#8ea598" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={full} fill="none" stroke="url(#sp-fade)" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
        {walked && <path d={walked} fill="none" stroke="#c19a4f" strokeWidth="2" strokeLinecap="round" className="transition-[d] duration-500 motion-reduce:transition-none" />}
      </svg>

      {/* the traveller: where you are on the path */}
      {here && shown > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2c77e] shadow-[0_0_0_4px_#f2c77e40,0_0_14px_#e9b87299] transition-[left,top] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: here.x, top: here.y }}
        />
      )}

      <ol aria-label="مسار الدراسة" className="relative m-0 flex list-none items-end justify-between gap-x-6 p-0">
        {GROUP_ORDER.map(group => {
          const stations = STATIONS.filter(s => s.group === group);
          return (
            <li key={group} className="flex flex-col items-center">
              {group !== 'today' && (
                <span className="mb-1.5 text-[10.5px] font-medium tracking-wide text-muted" aria-hidden="true">
                  {GROUP_LABEL[group]}
                </span>
              )}
              <ol aria-label={group === 'today' ? undefined : GROUP_LABEL[group]} className="m-0 flex list-none items-end gap-x-7 p-0 xl:gap-x-9">
                {stations.map(s => {
                  const i = STATIONS.indexOf(s);
                  const home = s.weight === 'home';
                  return (
                    <li key={s.to}>
                      <NavLink
                        to={s.to}
                        end={s.end}
                        aria-label={home ? `${s.label} — ${remaining.label}` : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group flex flex-col items-center gap-1.5 rounded-lg px-1 pb-0.5 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#c19a4f] focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                            isActive ? 'text-brand-night' : 'text-subtle hover:text-ink',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {home ? (
                              <span
                                ref={el => {
                                  dotRefs.current[i] = el;
                                }}
                                className={cn(
                                  'relative grid size-9 place-items-center rounded-full transition-[background-color,box-shadow] duration-300',
                                  isActive
                                    ? 'bg-brand-night text-dawn shadow-[0_0_0_4px_#f2c77e59]'
                                    : 'bg-white text-brand-night shadow-[0_0_0_1px_#0c2f261f] group-hover:shadow-[0_0_0_1px_#0c2f2640]',
                                )}
                              >
                                <span className="font-display text-[1.15rem] leading-none tabular-nums">{today}</span>
                                {remaining.total > 0 && <span className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-[#e0a94f] ring-2 ring-paper" />}
                              </span>
                            ) : (
                              <span
                                ref={el => {
                                  dotRefs.current[i] = el;
                                }}
                                style={{
                                  transform: `translateY(${LIFT[i]}px)`,
                                }}
                                className={cn(
                                  'block rounded-full border-2 bg-paper transition-[border-color,transform] duration-200',
                                  s.weight === 'primary' ? 'size-3' : 'size-2.5',
                                  isActive ? 'border-transparent' : 'border-[#b3c2b9] group-hover:border-brand',
                                )}
                              />
                            )}
                            <span
                              className={cn(
                                'whitespace-nowrap leading-none',
                                s.weight === 'secondary' ? 'text-[12.5px]' : 'text-[13.5px]',
                                isActive ? 'font-semibold' : home ? 'font-medium text-ink' : '',
                              )}
                            >
                              {s.label}
                              {home && remaining.total > 0 && <span className="ms-1 text-[11px] font-normal text-[#a2742a]">· {remaining.total}</span>}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
