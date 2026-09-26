import { useMemo, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, PageHeader, Progress, StatTile } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { DailyMinutesChart, SubjectBars } from '@/features/insights/charts';
import { useMinuteNow } from '@/features/insights/hooks';
import { DAY_MS, dailyTotals, minutesBySubject, startOfDay, streaks, summary } from '@/features/insights/selectors';
import { daysPhrase, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { ROUTES } from '@/routes/paths';

type Range = 7 | 30 | 0;

export function StatsPage() {
  const data = usePlannerStore(s => s.data);
  const now = useMinuteNow();
  const [range, setRange] = useState<Range>(30);

  const s = useMemo(() => summary(data), [data]);
  const streak = useMemo(() => streaks(data.studyLog, now), [data.studyLog, now]);
  const days = useMemo(() => dailyTotals(data.studyLog, now, 14), [data.studyLog, now]);
  const thisWeek = days.slice(7).reduce((n, d) => n + d.minutes, 0);
  const lastWeek = days.slice(0, 7).reduce((n, d) => n + d.minutes, 0);
  const since = range ? startOfDay(now) - (range - 1) * DAY_MS : undefined;
  const bySubject = useMemo(() => minutesBySubject(data.studyLog, since).slice(0, 8), [data.studyLog, since]);
  const delta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  if (!data.studyLog.length) {
    return (
      <div>
        <PageHeader title="الإحصائيات" />
        <Card>
          <EmptyState icon="chart" title="لا توجد بيانات بعد" description="أكمل أول جولة تركيز لتظهر هنا إحصائيات مذاكرتك." action={<ButtonLink to={ROUTES.timer} variant="primary" size="sm">ابدأ جولة</ButtonLink>} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="الإحصائيات" description="صورة واضحة لعاداتك في المذاكرة." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="إجمالي وقت المذاكرة" value={formatMinutes(s.totalMinutes)} icon="clock" note={`${s.sessions} جلسة`} />
        <StatTile
          label="هذا الأسبوع"
          value={formatMinutes(thisWeek)}
          icon="chart"
          note={delta === null ? 'لا بيانات للأسبوع الماضي' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% عن الأسبوع الماضي`}
        />
        <StatTile label="السلسلة الحالية" value={streak.current === 1 ? 'يوم واحد' : streak.current ? daysPhrase(streak.current) : '0'} icon="flame" note={`الأطول: ${daysPhrase(streak.longest)}`} />
        <StatTile label="متوسط الجلسة" value={formatMinutes(s.averageMinutes)} icon="timer" note={`${s.completionRate}% جولات مكتملة`} />
      </div>

      <Card aria-labelledby="chart-14">
        <CardHeader id="chart-14" title="دقائق المذاكرة — آخر 14 يومًا" description={`هذا الأسبوع ${formatMinutes(thisWeek)} · الأسبوع الماضي ${formatMinutes(lastWeek)}`} />
        <div className="px-4 pb-5 sm:px-5">
          <DailyMinutesChart days={days} title="دقائق المذاكرة لكل يوم في آخر 14 يومًا" height={200} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card aria-labelledby="by-subject" className="lg:col-span-2">
          <CardHeader
            id="by-subject"
            title="الوقت حسب المادة"
            action={
              <div role="radiogroup" aria-label="الفترة" className="flex rounded-lg border border-line p-0.5 text-[13px]">
                {(
                  [
                    [7, '7 أيام'],
                    [30, '30 يومًا'],
                    [0, 'الكل'],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={range === value} onClick={() => setRange(value)} className={cn('rounded-md px-2.5 py-1 transition-colors', range === value ? 'bg-mint font-semibold text-brand-deep' : 'text-subtle hover:text-ink')}>
                    {label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="px-4 pb-5 sm:px-5">
            <SubjectBars rows={bySubject} empty="لا جلسات في هذه الفترة." />
          </div>
        </Card>
        <Card aria-labelledby="lectures-progress">
          <CardHeader id="lectures-progress" title="إنجاز المحاضرات" />
          <div className="px-4 pb-5 sm:px-5">
            <p className="m-0 text-3xl font-semibold text-ink">{s.lecturesTotal ? Math.round((s.lecturesDone / s.lecturesTotal) * 100) : 0}%</p>
            <p className="m-0 mt-1 text-[13px] text-subtle">
              {s.lecturesDone} من {s.lecturesTotal} محاضرة
            </p>
            <Progress value={s.lecturesTotal ? (s.lecturesDone / s.lecturesTotal) * 100 : 0} label="نسبة المحاضرات المكتملة" className="mt-4" />
            <ButtonLink to={ROUTES.courses} size="sm" variant="ghost" className="mt-4 -ms-2">
              <Icon name="book" size={15} /> عرض المواد
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
