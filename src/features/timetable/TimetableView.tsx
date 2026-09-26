import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Weekday } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Field';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { DAY_KEYS, DAY_NAMES, GROUPS, classesFor, getWeekInfo, saveGroup, savedGroup, weekdayOf, type UniClass } from './schedule';
import { atMinutes } from './classTimes';
import { CopyScheduleDialog } from './CopyScheduleDialog';

/** Re-computes the section week and "now" every minute (the week flips on Friday). */
function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const isNow = (c: UniClass, now: number, today: boolean) => today && !!c.range && atMinutes(now, c.range.start) <= now && now < atMinutes(now, c.range.end);

function ClassBlock({ c, live, showGroup, compact }: { c: UniClass; live: boolean; showGroup?: boolean; compact?: boolean }) {
  return (
    <div className={cn('min-w-0 rounded-xl px-3 py-2.5', live ? 'bg-brand-night text-dawn' : 'bg-brand-soft/70 text-ink')}>
      {live && <p className="m-0 mb-0.5 text-[11px] font-semibold text-[#8fd6b3]">الآن</p>}
      <p lang={langOf(c.title)} className={cn('m-0 font-semibold leading-snug [overflow-wrap:anywhere]', compact ? 'text-[13px]' : 'text-[15px]')}>
        {c.title}
      </p>
      <p className={cn('m-0 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs', live ? 'text-dawn/75' : 'text-subtle')}>
        {c.room && (
          <span className="inline-flex items-center gap-1">
            <Icon name="mapPin" size={12} /> <span lang={langOf(c.room)}>{c.room}</span>
          </span>
        )}
        {c.instructor && <span lang={langOf(c.instructor)}>{c.instructor}</span>}
        {showGroup && <span>{c.label}</span>}
      </p>
      {c.extra.map((s, i) => (
        <p key={i} lang={langOf(s.title)} className="m-0 mt-2 border-t border-dashed border-current/20 pt-2 text-xs font-semibold [overflow-wrap:anywhere]">
          {s.title}
          {s.meta && <span className="block font-normal opacity-75">{s.meta}</span>}
        </p>
      ))}
    </div>
  );
}

/** Desktop week: days as columns, time slots as rows, today's column tinted. */
function WeekGrid({ group, section, now }: { group: string; section: number; now: number }) {
  const today = weekdayOf(now);
  const byDay = useMemo(() => Object.fromEntries(DAY_KEYS.map(d => [d, classesFor(d, group, section)])) as Record<Weekday, UniClass[]>, [group, section]);
  const slots = useMemo(() => {
    const all = DAY_KEYS.flatMap(d => byDay[d]);
    return [...new Map(all.map(c => [c.time, c])).values()].sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0)).map(c => c.time);
  }, [byDay]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white max-lg:hidden">
      <div role="table" aria-label="جدول الأسبوع" className="grid" style={{ gridTemplateColumns: `6.5rem repeat(${DAY_KEYS.length}, minmax(0, 1fr))` }}>
        <div role="row" className="contents">
          <span role="columnheader" className="border-b border-line px-4 py-3 text-xs text-muted">
            الوقت
          </span>
          {DAY_KEYS.map(d => (
            <span role="columnheader" key={d} className={cn('border-b border-s border-line px-4 py-3 text-sm font-semibold', d === today ? 'bg-brand-soft/60 text-brand-night' : 'text-ink')}>
              {DAY_NAMES[d]}
              {d === today && <span className="ms-2 rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">اليوم</span>}
            </span>
          ))}
        </div>
        {slots.map(slot => {
          const sample = DAY_KEYS.flatMap(d => byDay[d]).find(c => c.time === slot)!;
          return (
            <div role="row" key={slot} className="contents">
              <span role="rowheader" className="border-t border-line px-4 py-3 text-[13px] tabular-nums text-subtle first-of-type:border-t-0">
                {sample.range ? formatTime(atMinutes(now, sample.range.start)) : slot}
              </span>
              {DAY_KEYS.map(d => {
                const here = byDay[d].filter(c => c.time === slot);
                return (
                  <div role="cell" key={d} className={cn('grid content-start gap-1.5 border-s border-t border-line p-1.5', d === today && 'bg-brand-soft/30')}>
                    {here.map(c => (
                      <ClassBlock key={c.key} c={c} live={isNow(c, now, d === today)} compact />
                    ))}
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

/** One day at a time: chips to switch days, classes on a time rail. */
function DayView({ group, section, now, desktopToo }: { group: string; section: number; now: number; desktopToo: boolean }) {
  const today = weekdayOf(now);
  const [day, setDay] = useState<Weekday>(today ?? DAY_KEYS[0]);
  const classes = classesFor(day, group, section);
  const index = DAY_KEYS.indexOf(day);

  return (
    <div className={cn(!desktopToo && 'lg:hidden')}>
      <div className="mb-6 flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label="اليوم السابق" disabled={index === 0} onClick={() => setDay(DAY_KEYS[index - 1])}>
          <Icon name="chevron" size={18} />
        </Button>
        <div role="tablist" aria-label="اختيار اليوم" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {DAY_KEYS.map(d => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => setDay(d)}
              className={cn('relative shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors sm:px-4', d === day ? 'bg-brand-night font-semibold text-dawn' : 'text-subtle hover:bg-ink/5 hover:text-ink')}
            >
              {DAY_NAMES[d]}
              {d === today && <span aria-label="(اليوم)" className={cn('absolute end-1.5 top-1.5 size-1.5 rounded-full', d === day ? 'bg-[#8fd6b3]' : 'bg-brand')} />}
            </button>
          ))}
        </div>
        <Button size="icon" variant="ghost" aria-label="اليوم التالي" disabled={index === DAY_KEYS.length - 1} onClick={() => setDay(DAY_KEYS[index + 1])}>
          <Icon name="chevronNext" size={18} />
        </Button>
      </div>

      {classes.length ? (
        <ol role="tabpanel" aria-label={`محاضرات ${DAY_NAMES[day]}`} className="relative m-0 list-none space-y-4 p-0">
          {classes.map(c => (
            <li key={c.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4">
              <span className="pt-2.5 text-end text-[13px] tabular-nums leading-tight text-subtle">
                {c.range ? formatTime(atMinutes(now, c.range.start)) : c.time}
                {c.range && <span className="block text-[11px] text-muted">{formatTime(atMinutes(now, c.range.end))}</span>}
              </span>
              <ClassBlock c={c} live={isNow(c, now, day === today)} showGroup={!group} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon="calendar" title={`لا محاضرات يوم ${DAY_NAMES[day]}`} description={group ? 'يوم خالٍ لمجموعتك؛ مناسب للمذاكرة.' : undefined} />
      )}
    </div>
  );
}

/** Read-only university timetable, integrated with the app's typography and colours. */
export function TimetableView({ header }: { header?: (controls: ReactNode) => ReactNode }) {
  const now = useClock();
  const info = useMemo(() => getWeekInfo(new Date(now)), [now]);
  const [group, setGroup] = useState(savedGroup);
  const [copyOpen, setCopyOpen] = useState(false);

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="tt-group">
        مجموعتك
      </label>
      <Select
        id="tt-group"
        value={group}
        onChange={e => {
          setGroup(e.target.value);
          saveGroup(e.target.value);
        }}
        className="w-auto! rounded-full py-2 ps-4"
      >
        <option value="">كل المجموعات</option>
        {GROUPS.map(n => (
          <option key={n} value={n}>
            المجموعة {n}
          </option>
        ))}
      </Select>
      <Button onClick={() => setCopyOpen(true)}>
        <Icon name="clipboard" size={15} /> نسخ كنص
      </Button>
    </div>
  );

  return (
    <div>
      {header?.(controls)}
      <p className="m-0 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-subtle">
        <span className="rounded-full bg-mint px-3 py-1 font-semibold text-brand-deep">أسبوع {info.section}</span>
        <span>{info.label} · يتبدّل التناوب تلقائيًا كل جمعة</span>
        {!group && <span className="text-brand">اختر مجموعتك لعرض جدولك الأسبوعي كاملًا.</span>}
      </p>

      {group && <WeekGrid group={group} section={info.section} now={now} />}
      <DayView group={group} section={info.section} now={now} desktopToo={!group} />

      <p className="m-0 mt-8 text-xs leading-relaxed text-muted">
        (1) محاضرة المجموعة الأولى · (2) محاضرة المجموعة الثانية · (1&amp;2) مشتركة للمجموعتين — تظهر حسب أسبوع التناوب الحالي.
      </p>

      {copyOpen && <CopyScheduleDialog onClose={() => setCopyOpen(false)} initialDay={weekdayOf(now) ?? DAY_KEYS[0]} initialGroup={group} />}
    </div>
  );
}
