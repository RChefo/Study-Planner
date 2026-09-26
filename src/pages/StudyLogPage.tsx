import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, EmptyState, PageHeader, StatTile, StatusChip } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useMinuteNow } from '@/features/insights/hooks';
import { dayKey, sumMinutes } from '@/features/insights/selectors';
import { formatLongDay, formatMinutes, formatTime, relativeDay } from '@/lib/format';
import { usePlannerStore } from '@/stores/plannerStore';
import { ROUTES } from '@/routes/paths';

const PAGE = 50;

export function StudyLogPage() {
  const log = usePlannerStore(s => s.data.studyLog);
  const now = useMinuteNow();
  const [subject, setSubject] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const subjects = useMemo(() => [...new Set(log.map(l => l.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [log]);
  const filtered = useMemo(() => [...log].filter(l => !subject || l.subject === subject).sort((a, b) => b.startedAt - a.startedAt), [log, subject]);
  const visible = filtered.slice(0, limit);

  // Group the visible page by calendar day.
  const groups = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const l of visible) {
      const key = dayKey(l.startedAt);
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return [...map.entries()];
  }, [visible]);

  const total = sumMinutes(filtered);
  const completed = filtered.filter(l => l.completed).length;

  return (
    <div>
      <PageHeader title="سجل المذاكرة" description="كل جولة تركيز مكتملة أو محفوظة عند إيقاف المؤقت." actions={<ButtonLink to={ROUTES.timer} variant="primary"><Icon name="timer" size={16} /> ابدأ جولة</ButtonLink>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="الجلسات" value={filtered.length} icon="history" />
        <StatTile label="الوقت الكلي" value={formatMinutes(total)} icon="clock" />
        <StatTile label="متوسط الجلسة" value={formatMinutes(filtered.length ? total / filtered.length : 0)} icon="timer" />
        <StatTile label="جولات مكتملة" value={filtered.length ? `${Math.round((completed / filtered.length) * 100)}%` : '—'} icon="checkCircle" note={`${completed} من ${filtered.length}`} />
      </div>
      <Card>
        {subjects.length > 1 && (
          <div className="flex items-center gap-2 border-b border-line p-3">
            <label htmlFor="log-subject" className="text-[13px] text-subtle">
              المادة
            </label>
            <Select
              id="log-subject"
              value={subject}
              onChange={e => {
                setSubject(e.target.value);
                setLimit(PAGE);
              }}
              className="w-auto min-w-44"
            >
              <option value="">كل المواد</option>
              {subjects.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        )}
        {!filtered.length ? (
          <EmptyState icon="history" title="لم تسجل جلسات بعد" description="ابدأ جولة تركيز من المؤقت أو من أي محاضرة، وستظهر هنا تلقائيًا." action={<ButtonLink to={ROUTES.timer} variant="primary" size="sm">فتح المؤقت</ButtonLink>} />
        ) : (
          <>
            {groups.map(([key, entries]) => (
              <section key={key} aria-labelledby={`day-${key}`}>
                <h2 id={`day-${key}`} className="m-0 flex items-center justify-between border-b border-line bg-stripe px-4 py-1.5 text-xs font-semibold text-subtle">
                  <span>
                    {relativeDay(entries[0].startedAt, now)} · {formatLongDay(entries[0].startedAt)}
                  </span>
                  <span className="tabular-nums">{formatMinutes(sumMinutes(entries))}</span>
                </h2>
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {entries.map(l => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-16 shrink-0 text-xs tabular-nums text-subtle">{formatTime(l.startedAt)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate font-medium text-ink">{l.subject}</p>
                        <p className="m-0 truncate text-xs text-subtle">{l.topic}</p>
                      </div>
                      <StatusChip tone={l.completed ? 'done' : 'progress'} icon={l.completed ? 'checkCircle' : 'clock'}>
                        {l.completed ? 'مكتملة' : 'أُوقفت مبكرًا'}
                      </StatusChip>
                      <span className="w-14 shrink-0 text-end text-xs tabular-nums text-ink">{formatMinutes(l.duration)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {filtered.length > limit && (
              <div className="flex justify-center border-t border-line p-3">
                <Button onClick={() => setLimit(l => l + PAGE)}>عرض المزيد ({filtered.length - limit} متبقية)</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
