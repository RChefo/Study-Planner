import { useMemo, useState } from 'react';
import type { Commitment } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Card';
import { CompleteToggle } from '@/components/ui/CompleteToggle';
import { Icon } from '@/components/ui/Icon';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { Segmented } from '@/components/ui/Segmented';
import { inputClass } from '@/components/ui/Field';
import { previewAttachment, saveAttachment } from '@/components/previewAttachment';
import { CommitmentFormDialog } from '@/features/commitments/CommitmentFormDialog';
import { completedCommitments, groupOpenCommitments, type DueGroupId } from '@/features/commitments/grouping';
import { dueInfo, type DueInfo } from '@/features/insights/selectors';
import { useMinuteNow } from '@/features/insights/hooks';
import { dueText, formatLongDay, tasksPhrase } from '@/lib/format';
import { matchesQuery } from '@/lib/search';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction, toast } from '@/stores/uiStore';

const GROUP_TITLE: Record<DueGroupId, string> = {
  overdue: 'متأخرة',
  today: 'اليوم',
  tomorrow: 'غدًا',
  week: 'هذا الأسبوع',
  later: 'لاحقًا',
  none: 'بدون موعد',
};

const monthShort = new Intl.DateTimeFormat('ar-EG', { month: 'short' });

function DateTag({ dueDate, due, done }: { dueDate: string; due: DueInfo; done: boolean }) {
  if (due.state === 'none') {
    return (
      <span aria-hidden="true" className="grid h-12 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-line text-muted">
        <Icon name="clock" size={16} />
      </span>
    );
  }
  const date = new Date(`${dueDate}T12:00:00`);
  const late = !done && due.state === 'overdue';
  const soon = !done && (due.state === 'today' || due.state === 'tomorrow');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-12 w-11 shrink-0 content-center justify-items-center rounded-xl text-center leading-tight',
        done ? 'bg-[#eef1ec] text-muted' : late ? 'bg-[#f8e8dc] text-[#94401a]' : soon ? 'bg-brand-night text-dawn' : 'bg-white text-brand-night ring-1 ring-line',
      )}
    >
      <span className="text-lg font-semibold tabular-nums">{date.getDate()}</span>
      <span className="text-[10px]">{monthShort.format(date)}</span>
    </span>
  );
}

function CommitmentRow({ item, due, onEdit }: { item: Commitment; due: DueInfo; onEdit: () => void }) {
  const { setCommitmentDone, deleteItem } = usePlannerStore.getState();
  const done = !!item.done;
  const toggle = async () => {
    await setCommitmentDone(item.id, !done);
    toast(done ? 'أُعيد إلى القادمة' : 'أحسنت! نُقل إلى المنجزة', 'success');
  };
  const remove = async () => {
    const ok = await confirmAction(`حذف «${item.name}»؟`, { title: 'حذف الالتزام', confirmLabel: 'حذف', danger: true });
    if (ok) await deleteItem('commitments', item.id);
  };
  const menu: MenuItem[] = [
    { label: 'تعديل', icon: 'edit', onSelect: onEdit },
    ...(item.pdf
      ? [
          { label: 'معاينة المرفق', icon: 'eye' as const, onSelect: () => previewAttachment(item.pdf) },
          { label: 'تنزيل المرفق', icon: 'download' as const, onSelect: () => saveAttachment(item.pdf, item.pdfName ?? 'attachment.pdf') },
        ]
      : []),
    { label: 'حذف', icon: 'trash', onSelect: () => void remove(), danger: true },
  ];
  const late = !done && due.state === 'overdue';

  return (
    <li className="flex items-start gap-4 border-t border-line py-4 first:border-t-0">
      <CompleteToggle checked={done} onChange={() => void toggle()} label={done ? `إرجاع ${item.name} إلى القادمة` : `تم إنجاز ${item.name}`} className="mt-3" />
      <DateTag dueDate={item.dueDate} due={due} done={done} />
      <div className="min-w-0 flex-1 pt-0.5">
        <p lang={langOf(item.name)} className={cn('m-0 text-[15px] font-semibold [overflow-wrap:anywhere]', done ? 'text-subtle line-through decoration-[#b9c4be]' : 'text-ink')}>
          {item.name || 'بدون عنوان'}
        </p>
        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-subtle">
          {due.state !== 'none' ? (
            <>
              {!done && <span className={cn(late ? 'font-semibold text-[#94401a]' : due.state === 'today' ? 'font-semibold text-brand' : undefined)}>{dueText(due)}</span>}
              <span>{formatLongDay(new Date(`${item.dueDate}T12:00:00`).getTime())}</span>
            </>
          ) : (
            <span>بدون موعد تسليم</span>
          )}
          {item.pdf && (
            <button type="button" onClick={() => previewAttachment(item.pdf)} className="inline-flex items-center gap-1 text-brand hover:underline">
              <Icon name="file" size={13} /> {item.pdfName ?? 'مرفق'}
            </button>
          )}
        </p>
        {item.description && <p className="m-0 mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-subtle">{item.description}</p>}
      </div>
      <Menu label={`خيارات ${item.name}`} items={menu} className="-me-1" />
    </li>
  );
}

type View = 'open' | 'done';

/** Commitments by what matters: late, today, soon, later — and what's done. */
export function CommitmentsPage() {
  const commitments = usePlannerStore(s => s.data.commitments);
  const now = useMinuteNow();
  const [view, setView] = useState<View>('open');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ commitment: Commitment | null } | null>(null);

  const filtered = useMemo(() => commitments.filter(c => !query.trim() || matchesQuery(`${c.name} ${c.description}`, query)), [commitments, query]);
  const groups = useMemo(() => groupOpenCommitments(filtered, now), [filtered, now]);
  const done = useMemo(() => completedCommitments(filtered), [filtered]);

  const openCount = commitments.filter(c => !c.done).length;
  const overdue = commitments.filter(c => !c.done && dueInfo(c.dueDate, now).state === 'overdue').length;
  const doneCount = commitments.length - openCount;

  const add = (
    <Button variant="primary" size="lg" onClick={() => setForm({ commitment: null })}>
      <Icon name="plus" size={16} /> التزام جديد
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="الالتزامات"
        description={
          openCount
            ? `${openCount === 1 ? 'التزام واحد' : tasksPhrase(openCount)} قيد التنفيذ${overdue ? ` · ${overdue === 1 ? 'واحد متأخر' : `${overdue} متأخرة`}` : ''}`
            : 'التكليفات ومواعيد التسليم، مرتبة حسب ما يحين أولًا.'
        }
        actions={commitments.length ? add : undefined}
      />

      {commitments.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Segmented
            label="عرض الالتزامات"
            value={view}
            onChange={setView}
            options={[
              ['open', `القادمة (${openCount})`],
              ['done', `المنجزة (${doneCount})`],
            ]}
          />
          <label className="relative min-w-0 flex-1 basis-52 sm:max-w-xs">
            <span className="sr-only">ابحث في الالتزامات</span>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث…" className={cn(inputClass, 'rounded-full ps-10')} />
          </label>
        </div>
      )}

      {!commitments.length ? (
        <EmptyState icon="clipboard" title="جدولك صافٍ" description="أضف تكليفاتك ومواعيد تسليمها، وسنرتبها لك حسب الأقرب." action={add} />
      ) : view === 'open' ? (
        groups.length ? (
          <div className="max-w-3xl space-y-10">
            {groups.map(g => (
              <section key={g.id} aria-labelledby={`due-${g.id}`}>
                <h2 id={`due-${g.id}`} className={cn('m-0 mb-1 flex items-baseline gap-2 text-sm font-semibold', g.id === 'overdue' ? 'text-[#94401a]' : 'text-ink')}>
                  {GROUP_TITLE[g.id]}
                  <span className="text-[13px] font-normal tabular-nums text-muted">{g.items.length}</span>
                </h2>
                <ul className="m-0 list-none p-0">
                  {g.items.map(({ commitment, due }) => (
                    <CommitmentRow key={commitment.id} item={commitment} due={due} onEdit={() => setForm({ commitment })} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState icon="checkCircle" title={query ? 'لا نتائج' : 'جدولك صافٍ'} description={query ? `لا التزام يطابق «${query}».` : 'لا التزامات قيد التنفيذ. أحسنت!'} />
        )
      ) : done.length ? (
        <ul className="m-0 max-w-3xl list-none p-0">
          {done.map(c => (
            <CommitmentRow key={c.id} item={c} due={dueInfo(c.dueDate, now)} onEdit={() => setForm({ commitment: c })} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="clipboard" title={query ? 'لا نتائج' : 'لا التزامات منجزة بعد'} description={query ? undefined : 'عندما تنجز التزامًا، علّمه ليظهر هنا.'} />
      )}

      {form && <CommitmentFormDialog key={form.commitment?.id ?? 'new'} commitment={form.commitment} onClose={() => setForm(null)} />}
    </div>
  );
}
