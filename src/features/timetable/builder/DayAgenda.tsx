import { Fragment, useState } from 'react';
import type { Course, DayId, TimetableEntry, TimetableProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { useMinuteNow } from '@/features/insights/hooks';
import { arabicCount, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/cn';
import { DAY_LABEL, dayOf, entriesOnDay, freeGaps, orderedDays } from '../builder';
import { EntryCard } from './EntryCard';
import type { EntryDialogState } from './EntryDialog';

/**
 * Phones and tablets: one day at a time. A strip of the configured days (today marked), then
 * the day as a vertical list with its free time shown between classes — never a squeezed
 * 7-column grid.
 */
export function DayAgenda({
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
  const days = orderedDays(profile);
  const [picked, setPicked] = useState<DayId | null>(null);
  const day = picked && days.includes(picked) ? picked : days.includes(today) ? today : days[0];
  const items = entriesOnDay(profile, day);
  const gaps = freeGaps(items, 20);
  const gapBefore = (e: TimetableEntry) => gaps.find(g => g.end === e.start);

  return (
    <div>
      <div role="tablist" aria-label="أيام الجدول" className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map(d => {
          const count = profile.entries.filter(e => e.day === d && e.kind === 'class').length;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => setPicked(d)}
              className={cn(
                'relative flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2 text-sm transition-colors',
                d === day ? 'bg-brand-night text-dawn' : 'bg-white text-ink ring-1 ring-line hover:ring-[#cfd9d2]',
              )}
            >
              <span className={cn(d === day && 'font-semibold')}>{DAY_LABEL[d]}</span>
              <span className={cn('text-[11px] tabular-nums', d === day ? 'text-dawn/70' : 'text-muted')}>{count ? arabicCount(count, 'حصة', 'حصتان', 'حصص', 'حصة') : 'فارغ'}</span>
              {d === today && <span aria-label="(اليوم)" className={cn('absolute end-2 top-2 size-1.5 rounded-full', d === day ? 'bg-[#e0a94f]' : 'bg-brand')} />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={`يوم ${DAY_LABEL[day]}`}>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="m-0 flex-1 text-[15px] font-semibold text-ink">
            {DAY_LABEL[day]}
            {day === today && <span className="ms-2 inline-block text-xs font-normal text-brand">اليوم</span>}
          </h2>
          <Button size="sm" variant="primary" onClick={() => onAdd({ mode: 'add', day })}>
            <Icon name="plus" size={14} /> إضافة
          </Button>
          <Menu
            label={`خيارات يوم ${DAY_LABEL[day]}`}
            items={[
              { label: 'إضافة استراحة', icon: 'coffee', onSelect: () => onAdd({ mode: 'add', day, kind: 'break' }) },
              { label: 'نسخ اليوم إلى أيام أخرى…', icon: 'clipboard', onSelect: () => onCopyDay(day), disabled: !items.length },
            ]}
          />
        </div>

        {items.length ? (
          <ol className="m-0 list-none space-y-2 p-0">
            {items.map(e => {
              const gap = gapBefore(e);
              return (
                <Fragment key={e.id}>
                  {gap && (
                    <li aria-label={`وقت فراغ ${formatMinutes(gap.minutes)}`} className="flex items-center gap-3 py-1 ps-[4.25rem] text-xs text-muted">
                      <span aria-hidden="true" className="h-px flex-1 bg-[repeating-linear-gradient(to_left,#c9d3cc_0_4px,transparent_4px_8px)]" />
                      وقت فراغ · {formatMinutes(gap.minutes)}
                      <span aria-hidden="true" className="h-px flex-1 bg-[repeating-linear-gradient(to_left,#c9d3cc_0_4px,transparent_4px_8px)]" />
                    </li>
                  )}
                  <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3">
                    <span dir="ltr" className="pt-2 text-end text-[13px] tabular-nums leading-tight text-subtle">
                      {e.start}
                      <span className="block text-[11px] text-muted">{e.end}</span>
                    </span>
                    <EntryCard entry={e} courses={courses} display={profile.display} conflict={conflictIds.has(e.id)} onOpen={() => onOpen(e)} />
                  </li>
                </Fragment>
              );
            })}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d5ddd6] px-5 py-8 text-center">
            <p className="m-0 text-[15px] font-semibold text-ink">يوم {DAY_LABEL[day]} فارغ</p>
            <p className="m-0 mt-1 text-[13px] text-subtle">وقت متاح للمذاكرة — أو أضف حصص هذا اليوم.</p>
            <Button className="mt-4" size="sm" onClick={() => onAdd({ mode: 'add', day })}>
              <Icon name="plus" size={14} /> إضافة حصة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
