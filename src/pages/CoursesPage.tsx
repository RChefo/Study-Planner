import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Course } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, PageHeader, Progress, StatTile } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { inputClass } from '@/components/ui/Field';
import { CourseFormDialog } from '@/features/courses/CourseFormDialog';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import type { CourseInfo } from '@/features/insights/selectors';
import { formatMinutes, relativeDay } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { coursePath } from '@/routes/paths';

type Sort = 'recent' | 'progress' | 'name';

/** Dense, scannable list of courses with progress, counts, last studied and next lecture. */
export function CoursesPage() {
  const infos = useCourseInfos();
  const now = useMinuteNow();
  const deleteItem = usePlannerStore(s => s.deleteItem);
  const [form, setForm] = useState<{ course: Course | null } | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const totals = useMemo(() => {
    const total = infos.reduce((n, i) => n + i.total, 0);
    const done = infos.reduce((n, i) => n + i.done, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [infos]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = infos.filter(i => !q || i.course.name.toLowerCase().includes(q));
    const by: Record<Sort, (a: CourseInfo, b: CourseInfo) => number> = {
      recent: (a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0),
      progress: (a, b) => a.percent - b.percent,
      name: (a, b) => a.course.name.localeCompare(b.course.name, 'ar'),
    };
    return [...list].sort(by[sort]);
  }, [infos, query, sort]);

  const remove = async (info: CourseInfo) => {
    const ok = await confirmAction(`سيتم حذف «${info.course.name}» و${info.total} محاضرة داخلها. سجل المذاكرة يبقى كما هو.`, {
      title: 'حذف المادة',
      confirmLabel: 'حذف المادة',
      danger: true,
    });
    if (!ok) return;
    await deleteItem('courses', info.course.id);
    toast('تم حذف المادة', 'success');
  };

  return (
    <div>
      <PageHeader
        title="المواد الدراسية"
        description="تابع تقدّمك في كل مادة وافتحها لإدارة محاضراتها."
        actions={
          <Button variant="primary" onClick={() => setForm({ course: null })}>
            <Icon name="plus" size={16} /> أضف مادة
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="المواد" value={infos.length} icon="folder" />
        <StatTile label="المحاضرات" value={totals.total} icon="book" />
        <StatTile label="تمت مذاكرتها" value={totals.done} icon="checkCircle" />
        <StatTile label="الإنجاز الكلي" value={`${totals.pct}%`} icon="chart" note={`${totals.total - totals.done} محاضرة متبقية`} />
      </div>

      <Card>
        {infos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <label className="relative min-w-0 flex-1 basis-56">
              <span className="sr-only">ابحث في المواد</span>
              <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن مادة…" className={cn(inputClass, 'ps-9')} />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-subtle">
              ترتيب
              <select value={sort} onChange={e => setSort(e.target.value as Sort)} className={cn(inputClass, 'w-auto py-1.5')}>
                <option value="recent">الأحدث مذاكرة</option>
                <option value="progress">الأقل إنجازًا</option>
                <option value="name">الاسم</option>
              </select>
            </label>
          </div>
        )}

        {!infos.length ? (
          <EmptyState
            icon="folder"
            title="لم تضف أي مادة بعد"
            description="أضف أول مادة، ثم محاضراتها وملفاتها، لتبدأ تتبّع تقدّمك."
            action={
              <Button variant="primary" onClick={() => setForm({ course: null })}>
                <Icon name="plus" size={16} /> أضف مادة
              </Button>
            }
          />
        ) : !visible.length ? (
          <EmptyState icon="search" title="لا توجد نتائج" description={`لا توجد مادة تطابق «${query}».`} />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {visible.map(info => (
              <li key={info.course.id} className="group relative grid gap-x-6 gap-y-2 px-4 py-3.5 transition-colors hover:bg-[#fafbf9] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <Link to={coursePath(info.course.id)} className="block truncate text-[15px] font-semibold text-ink no-underline after:absolute after:inset-0 hover:text-brand">
                    {info.course.name}
                  </Link>
                  <p className="m-0 mt-0.5 truncate text-xs text-subtle">
                    {info.lastStudiedAt ? `آخر مذاكرة ${relativeDay(info.lastStudiedAt, now)}` : 'لم تُذاكر بعد'}
                    {info.minutes ? ` · ${formatMinutes(info.minutes)}` : ''}
                  </p>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-subtle">
                    <span>
                      {info.done}/{info.total} محاضرة
                    </span>
                    <span className="font-semibold text-ink">{info.percent}%</span>
                  </div>
                  <Progress value={info.percent} label={`تقدّم ${info.course.name}`} size="sm" />
                </div>
                <div className="min-w-0 text-xs">
                  <span className="text-subtle">التالية: </span>
                  <span className="text-ink">{info.nextLecture?.name ?? (info.total ? 'اكتملت المادة ✓' : 'أضف محاضرات')}</span>
                </div>
                {/* Actions sit above the row link (relative z-10) and are always visible. */}
                <div className="relative z-10 flex gap-1 md:justify-end">
                  <Button size="icon" variant="ghost" aria-label={`تعديل اسم ${info.course.name}`} onClick={() => setForm({ course: info.course })}>
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`حذف ${info.course.name}`} onClick={() => void remove(info)}>
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {form && <CourseFormDialog key={form.course?.id ?? 'new'} course={form.course} onClose={() => setForm(null)} />}
    </div>
  );
}
