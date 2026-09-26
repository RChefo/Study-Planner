import { useId, useState, type KeyboardEvent } from 'react';
import type { DayTotal } from './selectors';
import { formatMinutes, formatShortDate, formatWeekday } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Round the axis maximum up to a clean step (30 / 60 / 120 minutes…). */
function niceMax(max: number): number {
  const steps = [30, 60, 90, 120, 180, 240, 360, 480, 720, 960, 1440];
  return steps.find(s => s >= max) ?? Math.ceil(max / 60) * 60;
}

/**
 * Minutes studied per day (single series → no legend; the title names it).
 * HTML columns so the time axis follows the page direction (RTL: newest on the left).
 * One tab stop; arrow keys move between days; hover/focus shows a tooltip.
 */
export function DailyMinutesChart({ days, title, height = 160 }: { days: DayTotal[]; title: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const captionId = useId();
  const max = niceMax(Math.max(30, ...days.map(d => d.minutes)));
  const ticks = [max, max / 2, 0];
  const labelEvery = days.length > 10 ? 2 : 1;
  const current = active ?? null;
  const describe = (d: DayTotal) => `${formatWeekday(d.date)} ${formatShortDate(d.date)}: ${formatMinutes(d.minutes)} · ${d.sessions} جلسة`;

  const onKey = (e: KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) setActive(i => Math.min(days.length - 1, (i ?? days.length - 1) + (i === null ? 0 : 1)));
    else if (e.key === back) setActive(i => Math.max(0, (i ?? days.length - 1) - (i === null ? 0 : 1)));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(days.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <figure className="m-0">
      <figcaption id={captionId} className="sr-only">
        {title}
      </figcaption>
      <div
        role="group"
        aria-labelledby={captionId}
        aria-describedby={`${captionId}-hint`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative rounded-lg outline-offset-4"
      >
        <span id={`${captionId}-hint`} className="sr-only">
          استخدم الأسهم للتنقل بين الأيام
        </span>
        <div className="relative flex" style={{ height }}>
          {/* y-axis ticks + hairline gridlines */}
          <div className="relative w-10 shrink-0" aria-hidden="true">
            {ticks.map(t => (
              <span key={t} className="absolute end-1.5 -translate-y-1/2 text-[11px] tabular-nums text-subtle" style={{ top: `${100 - (t / max) * 100}%` }}>
                {t}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            {ticks.map(t => (
              <div key={t} aria-hidden="true" className="absolute inset-x-0 h-px bg-[#e6ebe6]" style={{ top: `${100 - (t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((d, i) => {
                const isToday = i === days.length - 1;
                const h = d.minutes ? Math.max(3, (d.minutes / max) * 100) : 0;
                return (
                  <div
                    key={d.key}
                    className="relative flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <div
                      className={cn('w-full max-w-6 rounded-t-[4px] transition-[height,opacity] duration-300', isToday ? 'bg-brand-deep' : 'bg-brand-bright', current !== null && current !== i && 'opacity-60')}
                      style={{ height: `${h}%` }}
                    />
                    {current === i && (
                      <div role="presentation" className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-40 rounded-lg bg-ink px-2.5 py-1.5 text-center text-xs text-white shadow-lg">
                        <div className="font-semibold">{formatMinutes(d.minutes)}</div>
                        <div className="text-white/75">
                          {formatWeekday(d.date)} {formatShortDate(d.date)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* x-axis labels */}
        <div className="flex ps-10" aria-hidden="true">
          <div className="flex flex-1 gap-[2px]">
            {days.map((d, i) => (
              <span key={d.key} className={cn('flex-1 truncate pt-1.5 text-center text-[11px]', i === days.length - 1 ? 'font-semibold text-ink' : 'text-subtle')}>
                {i % labelEvery === (days.length - 1) % labelEvery ? (i === days.length - 1 ? 'اليوم' : days.length > 7 ? new Date(d.date).getDate() : formatWeekday(d.date)) : ''}
              </span>
            ))}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {current !== null ? describe(days[current]) : ''}
        </p>
      </div>
      {/* Table view for assistive tech */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">اليوم</th>
            <th scope="col">الدقائق</th>
            <th scope="col">الجلسات</th>
          </tr>
        </thead>
        <tbody>
          {days.map(d => (
            <tr key={d.key}>
              <th scope="row">
                {formatWeekday(d.date)} {formatShortDate(d.date)}
              </th>
              <td>{d.minutes}</td>
              <td>{d.sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars (single series): label · bar · value. Values in ink, bars in brand. */
export function SubjectBars({ rows, empty }: { rows: Array<{ subject: string; minutes: number }>; empty: string }) {
  if (!rows.length) return <p className="m-0 py-6 text-center text-sm text-subtle">{empty}</p>;
  const max = Math.max(...rows.map(r => r.minutes), 1);
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {rows.map(r => (
        <li key={r.subject} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm max-sm:grid-cols-[minmax(0,6.5rem)_1fr_auto]">
          <span className="truncate text-ink" title={r.subject}>
            {r.subject}
          </span>
          <span className="h-2.5 overflow-hidden rounded-e-[4px] bg-[#eef2ee]" aria-hidden="true">
            <span className="block h-full rounded-e-[4px] bg-brand-bright" style={{ width: `${Math.max(2, (r.minutes / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums text-subtle">{formatMinutes(r.minutes)}</span>
        </li>
      ))}
    </ul>
  );
}
