import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Metric, PageHeader, Progress, SectionHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { DailyMinutesChart, SubjectBars } from '@/features/insights/charts';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import { DAY_MS, dailyTotals, minutesBySubject, startOfDay, streaks, summary, type DayTotal } from '@/features/insights/selectors';
import { daysPhrase, formatMinutes, formatShortDate, formatWeekday } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { ROUTES, coursePath } from '@/routes/paths';

const WEEKS = 18;

/** Calendar heatmap: one column per week (Saturday first), newest week at the reading end. */
function ActivityHeatmap({ now }: { now: number }) {
  const log = usePlannerStore(s => s.data.studyLog);
  const { weeks, activeDays } = useMemo(() => {
    const today = startOfDay(now);
    const offset = (new Date(today).getDay() + 1) % 7; // days since Saturday
    const days = dailyTotals(log, now, WEEKS * 7 - (6 - offset));
    const padded: Array<DayTotal | null> = [...days, ...Array.from({ length: 6 - offset }, () => null)];
    const cols: Array<Array<DayTotal | null>> = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
    return { weeks: cols, activeDays: days.filter(d => d.minutes > 0).length };
  }, [log, now]);
  const level = (m: number) => (m <= 0 ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);
  const COLORS = ['bg-[#e6ebe5]', 'bg-[#bfe0cd]', 'bg-[#7fc4a0]', 'bg-brand-bright', 'bg-brand-deep'];

  return (
    <section aria-labelledby="heatmap-title">
      <SectionHeader id="heatmap-title" title="نشاطك" description={`آخر ${WEEKS} أسبوعًا · ذاكرت في ${daysPhrase(activeDays)}`} />
      <div className="overflow-x-auto pb-2">
        <div role="img" aria-label={`خريطة نشاط المذاكرة لآخر ${WEEKS} أسبوعًا: ذاكرت في ${daysPhrase(activeDays)}`} className="flex w-max gap-[3px]">
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-rows-7 gap-[3px]">
              {week.map((d, j) =>
                d ? (
                  <span key={d.key} title={`${formatWeekday(d.date)} ${formatShortDate(d.date)}: ${formatMinutes(d.minutes)}`} className={cn('size-3.5 rounded-[4px] sm:size-4', COLORS[level(d.minutes)], d.date === startOfDay(now) && 'ring-2 ring-accent ring-offset-1 ring-offset-paper')} />
                ) : (
                  <span key={`pad-${j}`} className="size-3.5 sm:size-4" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <p aria-hidden="true" className="m-0 mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        أقل
        {COLORS.map(c => (
          <span key={c} className={cn('size-3 rounded-[3px]', c)} />
        ))}
        أكثر
      </p>
    </section>
  );
}

/** Meaningful numbers and a few honest charts — on its own page, never the dashboard's first thing. */
export function StatsPage() {
  const data = usePlannerStore(s => s.data);
  const infos = useCourseInfos();
  const now = useMinuteNow();
  const [range, setRange] = useState<7 | 30 | 0>(30);

  const s = useMemo(() => summary(data), [data]);
  const streak = useMemo(() => streaks(data.studyLog, now), [data.studyLog, now]);
  const days = useMemo(() => dailyTotals(data.studyLog, now, 14), [data.studyLog, now]);
  const thisWeek = days.slice(7).reduce((n, d) => n + d.minutes, 0);
  const lastWeek = days.slice(0, 7).reduce((n, d) => n + d.minutes, 0);
  const delta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const since = range ? startOfDay(now) - (range - 1) * DAY_MS : undefined;
  const bySubject = useMemo(() => minutesBySubject(data.studyLog, since).slice(0, 8), [data.studyLog, since]);

  if (!data.studyLog.length) {
    return (
      <div>
        <PageHeader title="الإحصائيات" />
        <EmptyState icon="chart" title="لا بيانات بعد" description="أكمل أول جولة تركيز لتظهر هنا صورة عاداتك في المذاكرة." action={<ButtonLink to={ROUTES.timer} variant="primary">ابدأ جولة</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="space-y-14">
      <PageHeader title="الإحصائيات" description="صورة هادئة لعاداتك في المذاكرة." className="mb-0 sm:mb-0" />

      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-7 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="إجمالي وقت المذاكرة" value={formatMinutes(s.totalMinutes)} />
        <Metric
          label="هذا الأسبوع"
          value={formatMinutes(thisWeek)}
          note={delta === null ? 'لا بيانات للأسبوع السابق' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% عن الأسبوع السابق`}
        />
        <Metric label="الجولات" value={s.sessions} note={`${s.completionRate}% اكتملت حتى النهاية`} />
        <Metric label="السلسلة الحالية" value={streak.current ? (streak.current === 1 ? 'يوم' : daysPhrase(streak.current)) : '—'} note={`الأطول: ${daysPhrase(Math.max(1, streak.longest))}`} />
        <Metric label="متوسط الجولة" value={formatMinutes(s.averageMinutes)} />
      </dl>

      <ActivityHeatmap now={now} />

      <section aria-labelledby="chart-14">
        <SectionHeader id="chart-14" title="آخر 14 يومًا" description={`هذا الأسبوع ${formatMinutes(thisWeek)} · الأسبوع السابق ${formatMinutes(lastWeek)}`} />
        <DailyMinutesChart days={days} title="دقائق المذاكرة لكل يوم في آخر 14 يومًا" height={200} />
      </section>

      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <section aria-labelledby="by-subject">
          <SectionHeader
            id="by-subject"
            title="الوقت حسب المادة"
            action={
              <Segmented
                label="الفترة"
                value={range}
                onChange={setRange}
                options={[
                  [7, '7 أيام'],
                  [30, '30 يومًا'],
                  [0, 'الكل'],
                ]}
              />
            }
          />
          <SubjectBars rows={bySubject} empty="لا جولات في هذه الفترة." />
        </section>

        <section aria-labelledby="course-progress">
          <SectionHeader id="course-progress" title="إنجاز المواد" description={`${s.lecturesDone} من ${s.lecturesTotal} محاضرة منجزة`} />
          {infos.length ? (
            <ul className="m-0 list-none space-y-4 p-0">
              {infos
                .filter(i => i.total)
                .sort((a, b) => b.percent - a.percent)
                .map(i => (
                  <li key={i.course.id}>
                    <Link to={coursePath(i.course.id)} className="group block no-underline">
                      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span lang={langOf(i.course.name)} className="truncate font-medium text-ink group-hover:text-brand">
                          {i.course.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-subtle">
                          {i.done}/{i.total} · {i.percent}%
                        </span>
                      </span>
                      <Progress value={i.percent} label={`تقدّم ${i.course.name}`} size="sm" />
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-subtle">
              <Icon name="book" size={15} /> أضف موادك ومحاضراتها لتتابع إنجازها هنا.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
