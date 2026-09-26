import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageHeader, SectionHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { useMinuteNow } from '@/features/insights/hooks';
import { dayKey, entriesSince, minutesBySubject, periodStart, sumMinutes, type LogPeriod } from '@/features/insights/selectors';
import { formatLongDay, formatMinutes, formatTime, relativeDay, roundsPhrase } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { ROUTES } from '@/routes/paths';

const PAGE = 40;
const PERIODS = [
  ['today', 'اليوم'],
  ['week', 'هذا الأسبوع'],
  ['month', 'هذا الشهر'],
  ['all', 'الكل'],
] as const;
const PERIOD_PHRASE: Record<LogPeriod, string> = { today: 'اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر', all: 'منذ البداية' };

/** A meaningful history: how much, on what, then every round in order. */
export function StudyLogPage() {
  const log = usePlannerStore(s => s.data.studyLog);
  const now = useMinuteNow();
  const [period, setPeriod] = useState<LogPeriod>('week');
  const [subject, setSubject] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const inPeriod = useMemo(() => entriesSince(log, periodStart(period, now)), [log, period, now]);
  const bySubject = useMemo(() => minutesBySubject(inPeriod), [inPeriod]);
  const total = sumMinutes(inPeriod);
  const completed = inPeriod.filter(l => l.completed).length;
  const entries = useMemo(() => inPeriod.filter(l => !subject || l.subject === subject).sort((a, b) => b.startedAt - a.startedAt), [inPeriod, subject]);
  const days = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const l of entries.slice(0, limit)) map.set(dayKey(l.startedAt), [...(map.get(dayKey(l.startedAt)) ?? []), l]);
    return [...map.entries()];
  }, [entries, limit]);
  const max = Math.max(1, ...bySubject.map(s => s.minutes));

  const startLink = (
    <ButtonLink to={ROUTES.timer} variant="primary" size="lg">
      <Icon name="timer" size={16} /> ابدأ جولة
    </ButtonLink>
  );

  if (!log.length) {
    return (
      <div>
        <PageHeader title="سجل المذاكرة" description="كل جولة تركيز تنهيها تُحفظ هنا تلقائيًا." />
        <EmptyState icon="history" title="لا جلسات مذاكرة بعد" description="ابدأ جولة تركيز من المؤقت أو من أي محاضرة، وستظهر هنا." action={startLink} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="سجل المذاكرة" description="كل جولة تركيز تنهيها تُحفظ هنا تلقائيًا." actions={startLink} />
      <Segmented
        label="الفترة"
        value={period}
        options={PERIODS}
        onChange={p => {
          setPeriod(p);
          setSubject(null);
          setLimit(PAGE);
        }}
        className="mb-8"
      />

      {/* Summary: one big number, then where the time went (click a subject to filter). */}
      <section aria-label="ملخص الفترة" className="mb-12 grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <p className="m-0 text-[13px] text-subtle">مذاكرة {PERIOD_PHRASE[period]}</p>
          <p className="m-0 mt-1 text-5xl font-semibold tracking-tight text-ink">{formatMinutes(total)}</p>
          <p className="m-0 mt-2 text-[13px] text-subtle">
            {inPeriod.length ? `${inPeriod.length === 1 ? 'جولة واحدة' : roundsPhrase(inPeriod.length)} · ${completed} مكتملة حتى النهاية` : 'لا جولات في هذه الفترة'}
          </p>
        </div>
        {bySubject.length > 0 && (
          <div>
            <p className="m-0 mb-3 text-[13px] text-subtle">حسب المادة</p>
            <ul className="m-0 list-none space-y-1 p-0">
              {bySubject.map(s => {
                const on = subject === s.subject;
                return (
                  <li key={s.subject}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSubject(on ? null : s.subject)}
                      className={cn('grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-4 rounded-lg px-2 py-1.5 text-start text-sm transition-colors max-sm:grid-cols-[minmax(0,6rem)_1fr_auto]', on ? 'bg-brand-soft' : 'hover:bg-white')}
                    >
                      <span lang={langOf(s.subject)} className={cn('truncate', on ? 'font-semibold text-brand-night' : 'text-ink')}>
                        {s.subject}
                      </span>
                      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#e3e9e2]">
                        <span className="block h-full origin-left rounded-full bg-brand motion-safe:animate-grow rtl:origin-right" style={{ width: `${Math.max(3, (s.minutes / max) * 100)}%` }} />
                      </span>
                      <span className="tabular-nums text-subtle">{formatMinutes(s.minutes)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="log-timeline" className="max-w-3xl">
        <SectionHeader
          id="log-timeline"
          title="الجولات"
          count={entries.length}
          action={
            subject ? (
              <button type="button" onClick={() => setSubject(null)} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-[13px] text-brand-night">
                <span lang={langOf(subject)}>{subject}</span> <Icon name="close" size={13} />
                <span className="sr-only">إلغاء التصفية</span>
              </button>
            ) : undefined
          }
          className="mb-6"
        />
        {!entries.length ? (
          <EmptyState icon="history" title="لا جولات في هذه الفترة" description="جرّب فترة أطول، أو ابدأ جولة الآن." />
        ) : (
          <div className="space-y-10">
            {days.map(([key, list]) => (
              <div key={key}>
                <h3 className="m-0 mb-4 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink">
                    {relativeDay(list[0].startedAt, now)} <span className="font-normal text-subtle">· {formatLongDay(list[0].startedAt)}</span>
                  </span>
                  <span className="tabular-nums text-subtle">{formatMinutes(sumMinutes(list))}</span>
                </h3>
                <ol className="relative m-0 list-none space-y-5 p-0">
                  <span aria-hidden="true" className="absolute inset-y-2 start-[calc(4rem+1rem+0.5rem-0.5px)] w-px bg-[#dfe5de]" />
                  {list.map(l => (
                    <li key={l.id} className="relative grid grid-cols-[4rem_1rem_minmax(0,1fr)_auto] items-start gap-x-4">
                      <time dateTime={new Date(l.startedAt).toISOString()} className="pt-0.5 text-end text-[13px] tabular-nums text-subtle">
                        {formatTime(l.startedAt)}
                      </time>
                      <span className={cn('mt-1.5 size-3 justify-self-center rounded-full ring-4 ring-paper', l.completed ? 'bg-brand' : 'bg-accent')} />
                      <div className="min-w-0">
                        <p lang={langOf(l.subject)} className="m-0 truncate text-[15px] font-semibold text-ink">
                          {l.subject}
                        </p>
                        <p className="m-0 mt-0.5 truncate text-[13px] text-subtle">
                          <span lang={langOf(l.topic)}>{l.topic}</span>
                          {!l.completed && <span className="text-[#7c4e0e]"> · أُوقفت مبكرًا</span>}
                        </p>
                      </div>
                      <span className="pt-0.5 text-sm tabular-nums text-ink">{formatMinutes(l.duration)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {entries.length > limit && (
              <Button onClick={() => setLimit(l => l + PAGE)}>عرض المزيد ({entries.length - limit})</Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
