import { Fragment } from 'react';
import { Link } from 'react-router';
import { SectionHeader, sectionLinkClass } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatMinutes, formatTime } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import type { Commitment } from '@/types';
import { nowIndex, type TimelineItem } from './timeline';

/** Rail geometry: time column 3.75rem, gap 1rem, rail column 1.25rem → centre of the rail. */
const RAIL = 'start-[calc(3.75rem+1rem+0.625rem-0.5px)]';
const ROW = 'relative grid grid-cols-[3.75rem_1.25rem_minmax(0,1fr)] gap-x-4';

function Dot({ item }: { item: TimelineItem }) {
  if (item.state === 'now') {
    return (
      <span className="relative mt-1 grid size-5 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-brand-bright/25 motion-safe:animate-ping" />
        <span className="size-3 rounded-full bg-brand-bright ring-4 ring-paper" />
      </span>
    );
  }
  if (item.state === 'done' && item.kind === 'study') {
    return (
      <span className={cn('mt-1 grid size-5 place-items-center rounded-full text-white ring-4 ring-paper', item.completed ? 'bg-brand' : 'bg-accent')}>
        <Icon name={item.completed ? 'check' : 'clock'} size={11} className="stroke-[3]" />
      </span>
    );
  }
  return <span className={cn('mt-1.5 size-3.5 justify-self-center rounded-full border-2 bg-paper ring-4 ring-paper', item.state === 'done' ? 'border-[#c5d0c9]' : 'border-brand')} />;
}

function Row({ item }: { item: TimelineItem }) {
  const past = item.state === 'done';
  const isClass = item.kind === 'class';
  return (
    <li className={cn(ROW, 'pb-7 last:pb-0')}>
      <time dateTime={new Date(item.start).toISOString()} className={cn('pt-1 text-end text-[13px] tabular-nums', item.state === 'now' ? 'font-semibold text-brand' : 'text-subtle')}>
        {formatTime(item.start)}
      </time>
      <Dot item={item} />
      <div className={cn('min-w-0', item.state === 'now' && '-mx-3 -my-2 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_2px_#0d2a2010,0_0_0_1px_#0d2a200a]')}>
        <p className="m-0 flex items-center gap-2 text-xs text-muted">
          {isClass ? 'محاضرة جامعية' : item.kind === 'focus' ? 'جولة تركيز' : item.completed ? 'جولة مكتملة' : 'جولة أُوقفت مبكرًا'}
          {item.state === 'now' && <span className="rounded-full bg-mint px-1.5 py-px text-[11px] font-semibold text-brand-deep">الآن</span>}
        </p>
        <p lang={langOf(item.title)} className={cn('m-0 mt-0.5 truncate text-[15px] font-semibold', past ? 'text-subtle' : 'text-ink')}>
          {item.title}
        </p>
        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-subtle">
          {isClass ? (
            <>
              {item.room && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="mapPin" size={13} /> <span lang={langOf(item.room)}>{item.room}</span>
                </span>
              )}
              {item.instructor && <span lang={langOf(item.instructor)}>{item.instructor}</span>}
              {item.end && <span>حتى {formatTime(item.end)}</span>}
            </>
          ) : (
            <>
              <span lang={langOf(item.detail)} className="min-w-0 truncate">
                {item.detail}
              </span>
              {item.minutes ? <span className="tabular-nums">{formatMinutes(item.minutes)}</span> : null}
            </>
          )}
        </p>
      </div>
    </li>
  );
}

function NowLine({ now }: { now: number }) {
  return (
    <li aria-label={`الآن ${formatTime(now)}`} className={cn(ROW, 'items-center pb-7')}>
      <span className="text-end text-[12px] font-semibold tabular-nums text-accent">{formatTime(now)}</span>
      <span className="size-2.5 justify-self-center rounded-full bg-accent ring-4 ring-paper" />
      <span aria-hidden="true" className="h-px bg-linear-to-l from-accent/60 to-transparent rtl:bg-linear-to-r" />
    </li>
  );
}

/**
 * The day as it actually is: logged rounds, the round in progress and university classes,
 * on one rail with a "now" line. Deadlines due today are pinned above it.
 */
export function TodayTimeline({ items, now, dueToday, group, classDay }: { items: TimelineItem[]; now: number; dueToday: Commitment[]; group: string; classDay: boolean }) {
  const cut = nowIndex(items, now);
  const hasNow = items.some(i => i.state === 'now');

  return (
    <section aria-labelledby="today-timeline">
      <SectionHeader id="today-timeline" title="يومك" description="ما مضى، وما يجري الآن، وما بقي" />

      {dueToday.length > 0 && (
        <ul className="m-0 mb-6 list-none space-y-1.5 p-0">
          {dueToday.map(c => (
            <li key={c.id}>
              <Link to={ROUTES.commitments} className="flex items-center gap-3 rounded-xl bg-[#fbf0dc] px-3.5 py-2.5 text-sm text-[#5d3a09] no-underline hover:bg-[#f8e8cc]">
                <Icon name="clipboard" size={16} />
                <span className="font-medium">مستحق اليوم</span>
                <span lang={langOf(c.name)} className="min-w-0 flex-1 truncate">
                  {c.name || 'بدون عنوان'}
                </span>
                <Icon name="chevronNext" size={15} className="opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length ? (
        <ol className="relative m-0 list-none p-0">
          <span aria-hidden="true" className={cn('absolute inset-y-2 w-px bg-[#dfe5de]', RAIL)} />
          {items.map((item, i) => (
            <Fragment key={item.id}>
              {i === cut && !hasNow && <NowLine now={now} />}
              <Row item={item} />
            </Fragment>
          ))}
          {cut === items.length && !hasNow && <NowLine now={now} />}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d5ddd6] px-5 py-8 text-center">
          <p className="m-0 text-[15px] font-semibold text-ink">يومك ما زال صفحة بيضاء.</p>
          <p className="m-0 mt-1 text-[13px] text-subtle">ستظهر هنا جولات التركيز التي تنهيها{classDay ? ' ومحاضراتك الجامعية' : ''}.</p>
        </div>
      )}

      {classDay && !group && (
        <p className="m-0 mt-5 flex flex-wrap items-center gap-x-2 text-[13px] text-subtle">
          <Icon name="calendar" size={15} className="text-brand" />
          اختر مجموعتك لتظهر محاضراتك الجامعية في يومك.
          <Link to={ROUTES.timetable} className={sectionLinkClass}>
            اختيار المجموعة
          </Link>
        </p>
      )}
    </section>
  );
}
