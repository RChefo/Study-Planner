import type { Course } from '@/types';
import { StatCard, StatsRow } from '@/components/ui/Surface';

export function CourseSummary({ courses }: { courses: Course[] }) {
  const lectures = courses.reduce((n, c) => n + (c.topics ?? []).length, 0);
  const done = courses.reduce((n, c) => n + (c.topics ?? []).filter(t => t.done).length, 0);
  return (
    <StatsRow className="mb-[14px] grid-cols-3 max-md:grid-cols-3 max-md:gap-[7px]">
      <StatCard compact label="إجمالي المحاضرات" value={lectures} note="في كل المواد" />
      <StatCard compact label="تمت مذاكرتها" value={done} note="محاضرة مكتملة" />
      <StatCard compact label="متبقية" value={lectures - done} note="محاضرة لم تُذاكر بعد" />
    </StatsRow>
  );
}
