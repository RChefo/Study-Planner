import { useMemo, useState } from 'react';
import type { Commitment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, PageHeader, StatusChip } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { inputClass } from '@/components/ui/Field';
import { previewAttachment, saveAttachment } from '@/components/previewAttachment';
import { CommitmentFormDialog } from '@/features/commitments/CommitmentFormDialog';
import { dueInfo, type DueInfo, type DueState } from '@/features/insights/selectors';
import { useMinuteNow } from '@/features/insights/hooks';
import { dueText, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction, toast } from '@/stores/uiStore';

type Filter = 'open' | 'done' | 'all';
const DUE_TONE: Record<DueState, 'danger' | 'warning' | 'info' | 'idle'> = { overdue: 'danger', today: 'warning', tomorrow: 'warning', soon: 'info', later: 'idle', none: 'idle' };
const GROUPS: Array<{ id: string; title: string; match: (d: DueInfo) => boolean }> = [
  { id: 'overdue', title: 'متأخرة', match: d => d.state === 'overdue' },
  { id: 'week', title: 'خلال 7 أيام', match: d => d.state === 'today' || d.state === 'tomorrow' || d.state === 'soon' },
  { id: 'later', title: 'لاحقًا', match: d => d.state === 'later' },
  { id: 'none', title: 'بدون موعد', match: d => d.state === 'none' },
];

function CommitmentRow({ item, due, onEdit }: { item: Commitment; due: DueInfo; onEdit: () => void }) {
  const { setCommitmentDone, deleteItem } = usePlannerStore.getState();
  const toggle = async () => {
    await setCommitmentDone(item.id, !item.done);
    toast(item.done ? 'أُعيد الالتزام إلى قيد التنفيذ' : 'مبروك! نُقل إلى المنجز', 'success');
  };
  const remove = async () => {
    const ok = await confirmAction(`حذف «${item.name}»؟`, { title: 'حذف الالتزام', confirmLabel: 'حذف', danger: true });
    if (ok) await deleteItem('commitments', item.id);
  };
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input type="checkbox" checked={!!item.done} onChange={() => void toggle()} aria-label={item.done ? `إرجاع ${item.name} إلى قيد التنفيذ` : `تم إنجاز ${item.name}`} className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-brand" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('m-0 min-w-0 text-sm font-medium', item.done ? 'text-subtle line-through decoration-[#b9c4be]' : 'text-ink')}>{item.name || 'بدون عنوان'}</p>
          {!item.done && (
            <StatusChip tone={DUE_TONE[due.state]} icon={due.state === 'overdue' ? 'alert' : 'clock'}>
              {dueText(due)}
            </StatusChip>
          )}
        </div>
        {(item.description || item.dueDate) && (
          <p className="m-0 mt-1 line-clamp-2 text-[13px] leading-relaxed text-subtle">
            {item.dueDate ? `التسليم ${formatShortDate(new Date(`${item.dueDate}T12:00:00`).getTime())}` : ''}
            {item.dueDate && item.description ? ' · ' : ''}
            {item.description}
          </p>
        )}
        {item.pdf && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => previewAttachment(item.pdf)}>
              <Icon name="eye" size={14} /> معاينة
            </Button>
            <Button size="sm" variant="ghost" onClick={() => saveAttachment(item.pdf, item.pdfName ?? 'attachment.pdf')}>
              <Icon name="download" size={14} /> تنزيل
            </Button>
            <span className="truncate text-xs text-subtle">{item.pdfName}</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`تعديل ${item.name}`}>
          <Icon name="edit" size={15} />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => void remove()} aria-label={`حذف ${item.name}`}>
          <Icon name="trash" size={15} />
        </Button>
      </div>
    </li>
  );
}

export function CommitmentsPage() {
  const commitments = usePlannerStore(s => s.data.commitments);
  const now = useMinuteNow();
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ commitment: Commitment | null } | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commitments
      .filter(c => (filter === 'all' ? true : filter === 'done' ? c.done : !c.done))
      .filter(c => !q || `${c.name} ${c.description}`.toLowerCase().includes(q))
      .map(c => ({ item: c, due: dueInfo(c.dueDate, now) }))
      .sort((a, b) => (a.due.days ?? Infinity) - (b.due.days ?? Infinity));
  }, [commitments, filter, query, now]);

  const openCount = commitments.filter(c => !c.done).length;
  const doneCount = commitments.length - openCount;
  const overdue = commitments.filter(c => !c.done && dueInfo(c.dueDate, now).state === 'overdue').length;

  const renderList = (list: typeof items) => (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {list.map(({ item, due }) => (
        <CommitmentRow key={item.id} item={item} due={due} onEdit={() => setForm({ commitment: item })} />
      ))}
    </ul>
  );

  return (
    <div>
      <PageHeader
        title="الالتزامات"
        description={overdue ? `لديك ${overdue} ${overdue === 1 ? 'التزام متأخر' : 'التزامات متأخرة'}` : 'التكليفات ومواعيد التسليم في مكان واحد.'}
        actions={
          <Button variant="primary" onClick={() => setForm({ commitment: null })}>
            <Icon name="plus" size={16} /> التزام جديد
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div role="radiogroup" aria-label="تصفية الالتزامات" className="flex rounded-lg border border-line p-0.5 text-[13px]">
            {(
              [
                ['open', `قيد التنفيذ (${openCount})`],
                ['done', `منجزة (${doneCount})`],
                ['all', 'الكل'],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)} className={cn('rounded-md px-2.5 py-1 transition-colors', filter === value ? 'bg-mint font-semibold text-brand-deep' : 'text-subtle hover:text-ink')}>
                {label}
              </button>
            ))}
          </div>
          <label className="relative min-w-0 flex-1 basis-48">
            <span className="sr-only">ابحث في الالتزامات</span>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث…" className={cn(inputClass, 'ps-9')} />
          </label>
        </div>

        {!items.length ? (
          <EmptyState
            icon="clipboard"
            title={query ? 'لا توجد نتائج' : filter === 'done' ? 'لا توجد التزامات منجزة بعد' : filter === 'open' ? 'لا توجد التزامات قيد التنفيذ' : 'لا توجد التزامات'}
            description={!query && filter !== 'done' ? 'أضف تكليفاتك ومواعيد تسليمها لتظهر هنا مرتبة حسب الأولوية.' : undefined}
            action={!query && filter !== 'done' ? <Button variant="primary" onClick={() => setForm({ commitment: null })}><Icon name="plus" size={15} /> التزام جديد</Button> : undefined}
          />
        ) : filter === 'open' ? (
          GROUPS.map(group => {
            const list = items.filter(i => group.match(i.due));
            if (!list.length) return null;
            return (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <h2 id={`group-${group.id}`} className={cn('m-0 border-b border-line bg-stripe px-4 py-1.5 text-xs font-semibold', group.id === 'overdue' ? 'text-[#a23b24]' : 'text-subtle')}>
                  {group.title} · {list.length}
                </h2>
                {renderList(list)}
              </section>
            );
          })
        ) : (
          renderList(items)
        )}
      </Card>
      {form && <CommitmentFormDialog key={form.commitment?.id ?? 'new'} commitment={form.commitment} onClose={() => setForm(null)} />}
    </div>
  );
}
