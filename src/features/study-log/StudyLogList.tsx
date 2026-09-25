import type { StudyLogEntry } from '@/types';
import { dateKey, formatLogDate } from '@/lib/dates';
import { useTimerStore } from '@/stores/timerStore';
import { EmptyState, Hint, ListRow, Panel, StatCard, StatUnit, StatsRow } from '@/components/ui/Surface';

export function StudyLogSummary({ logs }: { logs: StudyLogEntry[] }) {
  const minutes = logs.reduce((n, l) => n + (l.duration || 0), 0);
  const today = dateKey(useTimerStore(s => s.now));
  return (
    <StatsRow>
      <StatCard label="جلسات التركيز" value={logs.length} />
      <StatCard
        label="وقت المذاكرة المسجل"
        value={
          <>
            {Math.floor(minutes / 60)}
            <StatUnit> س </StatUnit>
            {minutes % 60}
            <StatUnit> د</StatUnit>
          </>
        }
      />
      <StatCard label="اليوم" value={logs.filter(l => dateKey(l.startedAt) === today).length} note="جلسة تركيز" />
    </StatsRow>
  );
}

export function StudyLogList({ logs }: { logs: StudyLogEntry[] }) {
  return (
    <Panel>
      <div className="grid gap-2">
        {logs.length ? (
          logs.map(l => (
            <ListRow key={l.id}>
              <div>
                <b>
                  {l.subject} — {l.topic}
                </b>
                <Hint>
                  {formatLogDate(l.startedAt)} · {l.duration} دقيقة · {l.completed ? 'مكتملة' : 'أُوقفت مبكرًا'}
                </Hint>
              </div>
            </ListRow>
          ))
        ) : (
          <EmptyState>لم تسجل جلسات مذاكرة بعد. ابدأ المؤقت من إحدى جلسات اليوم.</EmptyState>
        )}
      </div>
    </Panel>
  );
}
