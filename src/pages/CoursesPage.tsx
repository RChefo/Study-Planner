import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Course } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader, Progress } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { Segmented } from '@/components/ui/Segmented';
import { inputClass } from '@/components/ui/Field';
import { CourseFormDialog } from '@/features/courses/CourseFormDialog';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import type { CourseInfo } from '@/features/insights/selectors';
import { startLectureStudy } from '@/features/timer/timerController';
import { coursesPhrase, formatMinutes, lecturesPhrase, relativeDay } from '@/lib/format';
import { matchesQuery } from '@/lib/search';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { ROUTES, coursePath } from '@/routes/paths';

type Sort = 'recent' | 'progress' | 'name';
const SORTS = [
  ['recent', 'الأحدث مذاكرة'],
  ['progress', 'الأقل إنجازًا'],
  ['name', 'الاسم'],
] as const;

function CourseRow({ info, now, onEdit, onDelete }: { info: CourseInfo; now: number; onEdit: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  const timerActive = useTimerStore(s => s.timer.active);
  const next = info.nextLecture;
  const complete = info.total > 0 && info.remaining === 0;

  return (
    <li className="group relative grid gap-x-8 gap-y-4 border-t border-line py-7 first:border-t-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
      <div className="min-w-0">
        <Link
          to={coursePath(info.course.id)}
          lang={langOf(info.course.name)}
          className="font-display block truncate text-[1.75rem] leading-snug text-brand-night no-underline after:absolute after:inset-0 after:rounded-2xl group-hover:text-brand"
        >
          {info.course.name}
        </Link>
        <p className="m-0 mt-1 text-[13px] text-subtle">
          {info.lastStudiedAt ? `آخر مذاكرة ${relativeDay(info.lastStudiedAt, now)}` : 'لم تُذاكر بعد'}
          {info.minutes ? ` · ${formatMinutes(info.minutes)} إجمالًا` : ''}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold tabular-nums text-ink">{info.percent}%</span>
          <span className="text-[13px] text-subtle">
            {info.total ? `${info.done} / ${info.total} محاضرة` : 'لا محاضرات بعد'}
          </span>
        </div>
        <Progress value={info.percent} label={`تقدّم ${info.course.name}`} size="sm" />
      </div>

      <div className="relative z-10 flex min-w-0 items-center gap-3">
        {next ? (
          <>
            <button
              type="button"
              disabled={timerActive}
              title={timerActive ? 'هناك جولة جارية' : undefined}
              onClick={() => startLectureStudy(info.course.id, next.index) && navigate(ROUTES.timer)}
              aria-label={`ابدأ مذاكرة ${next.name}`}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-night text-dawn transition-colors hover:bg-brand disabled:opacity-40"
            >
              <Icon name="play" size={15} />
            </button>
            <div className="min-w-0">
              <p className="m-0 text-xs text-muted">{next.status === 'in-progress' ? 'تكمل' : 'التالية'}</p>
              <p lang={langOf(next.name)} className="m-0 truncate text-sm font-semibold text-ink">
                {next.name}
              </p>
            </div>
          </>
        ) : complete ? (
          <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-brand">
            <Icon name="checkCircle" size={18} /> اكتملت المادة
          </p>
        ) : (
          <Link to={coursePath(info.course.id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand no-underline hover:underline">
            <Icon name="plus" size={15} /> أضف أول محاضرة
          </Link>
        )}
      </div>

      <div className="relative z-10 flex justify-end max-md:absolute max-md:end-0 max-md:top-6">
        <Menu
          label={`خيارات ${info.course.name}`}
          items={[
            { label: 'تعديل الاسم', icon: 'edit', onSelect: onEdit },
            { label: 'حذف المادة', icon: 'trash', onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  );
}

/** Courses as learning journeys: progress, what's next, when it was last touched. */
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
    const list = infos.filter(i => !query.trim() || matchesQuery(i.course.name, query));
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

  const addButton = (
    <Button variant="primary" size="lg" onClick={() => setForm({ course: null })}>
      <Icon name="plus" size={16} /> أضف مادة
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="المواد"
        description={
          infos.length
            ? `${infos.length === 1 ? 'مادة واحدة' : coursesPhrase(infos.length)} · ${totals.total === 1 ? 'محاضرة واحدة' : lecturesPhrase(totals.total)} · أنجزت ${totals.pct}% منها`
            : 'كل مادة مسار: محاضرات تنجزها واحدة تلو الأخرى.'
        }
        actions={infos.length ? addButton : undefined}
      />

      {!infos.length ? (
        <EmptyState icon="folder" title="لا مواد بعد" description="أضف أول مادة لتبدأ ببناء مسار مذاكرتك." action={addButton} />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1 basis-60 sm:max-w-xs">
              <span className="sr-only">ابحث في المواد</span>
              <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن مادة…" className={cn(inputClass, 'rounded-full ps-10')} />
            </label>
            <Segmented label="ترتيب المواد" value={sort} options={SORTS} onChange={setSort} className="ms-auto" />
          </div>

          {visible.length ? (
            <ul className="m-0 list-none p-0">
              {visible.map(info => (
                <CourseRow key={info.course.id} info={info} now={now} onEdit={() => setForm({ course: info.course })} onDelete={() => void remove(info)} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="search" title="لا نتائج" description={`لا توجد مادة تطابق «${query}».`} />
          )}
        </>
      )}

      {form && <CourseFormDialog key={form.course?.id ?? 'new'} course={form.course} onClose={() => setForm(null)} />}
    </div>
  );
}
