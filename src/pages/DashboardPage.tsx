import { useAuthStore } from '@/stores/authStore';
import { formatLongDay, greeting } from '@/lib/format';
import { useMinuteNow } from '@/features/insights/hooks';
import {
  CoursesProgressCard,
  CurrentSessionCard,
  RecentActivityCard,
  TimetableTodayCard,
  TodayPlanCard,
  TodayProgressCard,
  UpcomingCommitmentsCard,
  WeekChartCard,
} from '@/features/dashboard/cards';

/** "What do I need to do today?" — built entirely from the user's real data. */
export function DashboardPage() {
  const now = useMinuteNow();
  const name = useAuthStore(s => s.user?.name?.split(' ')[0]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-ink">
            {greeting(now)}
            {name ? `، ${name}` : ''} 👋
          </h1>
          <p className="m-0 mt-1 text-sm text-subtle">{formatLongDay(now)} · ابدأ بخطوة صغيرة؛ الاستمرارية أهم من الكمال.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <CurrentSessionCard />
        </div>
        <TodayProgressCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TodayPlanCard />
        </div>
        <UpcomingCommitmentsCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <WeekChartCard />
        </div>
        <TimetableTodayCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <CoursesProgressCard />
        </div>
        <RecentActivityCard />
      </div>
    </div>
  );
}
