import { useMemo, type MouseEvent } from 'react';
import type { Course, DayId, TimetableEntry, TimetableProfile } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { useMinuteNow } from '@/features/insights/hooks';
import { cn } from '@/lib/cn';
import { DAY_LABEL, dayOf, entriesOnDay, fromMin, layoutDay, orderedDays, toMin, visibleRange } from '../builder';
import { EntryCard } from './EntryCard';
import type { EntryDialogState } from './EntryDialog';

/**
 * Desktop week: a time axis and one column per configured day. Empty time stays visibly
 * empty (free time is never stored); in period mode the student's periods are drawn as soft
 * bands, and the gaps between them read as breaks. Click empty space to add a class there.
 */
export function WeekGrid({
  profile,
  courses,
  conflictIds,
  onAdd,
  onOpen,
  onCopyDay,
}: {
  profile: TimetableProfile;
  courses: Course[];
  conflictIds: Set<string>;
  onAdd: (s: EntryDialogState) => void;
  onOpen: (e: TimetableEntry) => void;
  onCopyDay: (day: DayId) => void;
}) {
  const now = useMinuteNow();
  const today = dayOf(now);
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const days = orderedDays(profile);
  const range = visibleRange(profile);
  const ppm = profile.display.density === 'compact' ? 0.8 : 1.1;
  const height = (range.end - range.start) * ppm;
  const y = (m: number) => (m - range.start) * ppm;
  const hours = Array.from({ length: (range.end - range.start) / 60 + 1 }, (_, i) => range.start + i * 60);
  const periods = profile.mode === 'periods' ? profile.periods : [];
  const layouts = useMemo(() => new Map(days.map(d => [d, layoutDay(entriesOnDay(profile, d))])), [days, profile]);

  const addAt = (day: DayId, e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const offset = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const minute = range.start + Math.round(offset / ppm / 15) * 15;
    const period = periods.find(p => toMin(p.start) <= minute && minute < toMin(p.end));
    if (period) onAdd({ mode: 'add', day, start: period.start, end: period.end, periodId: period.id });
    else onAdd({ mode: 'add', day, start: fromMin(minute), end: fromMin(Math.min(minute + 60, range.end)) });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="grid" style={{ gridTemplateColumns: `${periods.length ? 7.25 : 4.25}rem repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* header */}
        <div className="border-b border-line" />
        {days.map(d => {
          const all = profile.entries.filter(e => e.day === d);
          const count = all.filter(e => e.kind === 'class').length;
          return (
            <div key={d} className={cn('flex min-w-0 items-center gap-1 border-b border-s border-line px-2 py-2.5', d === today && 'bg-brand-soft/60')}>
              <span className={cn('truncate text-sm font-semibold', d === today ? 'text-brand-night' : 'text-ink')}>{DAY_LABEL[d]}</span>
              {d === today && <span className="shrink-0 rounded-full bg-brand px-1.5 py-px text-[10px] text-white max-xl:sr-only">اليوم</span>}
              <span className="text-[11px] tabular-nums text-muted">{count || ''}</span>
              <span className="ms-auto flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onAdd({ mode: 'add', day: d })}
                  aria-label={`إضافة حصة يوم ${DAY_LABEL[d]}`}
                  className="grid size-7 place-items-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink max-xl:hidden"
                >
                  <Icon name="plus" size={15} />
                </button>
                <Menu
                  label={`خيارات يوم ${DAY_LABEL[d]}`}
                  triggerClassName="size-7"
                  items={[
                    { label: 'إضافة حصة', icon: 'plus', onSelect: () => onAdd({ mode: 'add', day: d }) },
                    { label: 'إضافة استراحة', icon: 'coffee', onSelect: () => onAdd({ mode: 'add', day: d, kind: 'break' }) },
                    { label: 'نسخ اليوم إلى أيام أخرى…', icon: 'clipboard', onSelect: () => onCopyDay(d), disabled: !all.length },
                  ]}
                />
              </span>
            </div>
          );
        })}

        {/* time axis: hours, plus the student's periods when in period mode */}
        <div className="relative" style={{ height }}>
          {hours.slice(0, -1).map(h => (
            <span key={h} className="absolute end-1.5 -translate-y-1/2 text-[11px] tabular-nums text-muted first:translate-y-0" style={{ top: y(h) }}>
              {fromMin(h)}
            </span>
          ))}
          {periods.map(p => (
            <span key={p.id} className="absolute start-1 max-w-[3.9rem] truncate rounded-md bg-[#f4eee0] px-1.5 text-[10px] font-medium leading-4 text-[#6b5a36]" style={{ top: y(toMin(p.start)) + 1 }} title={`${p.name} · ${p.start}–${p.end}`}>
              {p.name}
            </span>
          ))}
        </div>

        {days.map(d => {
          const items = entriesOnDay(profile, d);
          const lay = layouts.get(d)!;
          return (
            <div
              key={d}
              role="presentation"
              onClick={e => addAt(d, e)}
              className={cn('relative cursor-copy border-s border-line', d === today && 'bg-brand-soft/25')}
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, #e9eee8 0 1px, transparent 1px ${60 * ppm}px)`,
                backgroundPositionY: `${y(hours[0])}px`,
              }}
            >
              {periods.map(p => (
                <span key={p.id} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-y border-[#efe6cf] bg-[#faf6ec]/70" style={{ top: y(toMin(p.start)), height: (toMin(p.end) - toMin(p.start)) * ppm }} />
              ))}
              {d === today && nowMin >= range.start && nowMin <= range.end && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-[#e0a94f]" style={{ top: y(nowMin) }}>
                  <span className="absolute -top-1 start-0 size-2.5 rounded-full bg-[#e0a94f]" />
                </span>
              )}
              {items.map(e => {
                const { lane, lanes } = lay.get(e.id) ?? { lane: 0, lanes: 1 };
                const top = y(toMin(e.start));
                const h = Math.max(22, (toMin(e.end) - toMin(e.start)) * ppm - 2);
                return (
                  <div key={e.id} className="absolute z-[5] p-0.5" style={{ top, height: h, insetInlineStart: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%` }}>
                    <EntryCard entry={e} courses={courses} display={profile.display} conflict={conflictIds.has(e.id)} onOpen={() => onOpen(e)} fill />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
