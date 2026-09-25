import { useNavigate } from 'react-router';
import { StatCard, StatUnit, StatsRow } from '@/components/ui/Surface';
import { formatLongDate } from '@/lib/dates';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { todayStudyMinutes } from '@/features/timer/timerMath';
import { ROUTES } from '@/routes/paths';

export function Hero() {
  // Re-rendered by the timer tick, so the greeting/date stay current.
  const now = new Date(useTimerStore(s => s.now));
  return (
    <section className="mb-5 flex items-center justify-between gap-5 rounded-[20px] bg-hero px-[27px] py-6 max-md:flex-col max-md:items-start">
      <div>
        <h2 className="mb-[5px] mt-0 text-[22px] font-bold">{now.getHours() < 12 ? 'صباح الخير' : 'مساء الخير'} 👋</h2>
        <p className="m-0 text-[#587066]">ابدأ بخطوة صغيرة؛ الاستمرارية أهم من الكمال.</p>
      </div>
      <div className="whitespace-nowrap text-left text-sm font-semibold text-brand max-md:text-right">{formatLongDate(now)}</div>
    </section>
  );
}

export function DashboardStats() {
  const navigate = useNavigate();
  const data = usePlannerStore(s => s.data);
  const timer = useTimerStore(s => s.timer);
  const now = useTimerStore(s => s.now);
  const lectures = data.courses.reduce((n, c) => n + (c.topics ?? []).length, 0);
  const activeCommitments = data.commitments.filter(c => !c.done).length;
  const goToCommitments = () => navigate(ROUTES.commitments);

  return (
    <StatsRow>
      <StatCard label="إجمالي المحاضرات" value={lectures} note="في كل المواد" />
      <StatCard
        label="وقت مذاكرة اليوم"
        value={
          <>
            {todayStudyMinutes(data, timer, now)}
            <StatUnit> دقيقة</StatUnit>
          </>
        }
        note="وقت تركيز فعلي"
      />
      <StatCard
        role="button"
        tabIndex={0}
        aria-label={`التزاماتي: ${activeCommitments} قيد التنفيذ — اضغط للعرض`}
        className="cursor-pointer"
        onClick={goToCommitments}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToCommitments();
          }
        }}
        label="التزاماتي"
        value={activeCommitments}
        note="قيد التنفيذ · اضغط للعرض"
      />
    </StatsRow>
  );
}
