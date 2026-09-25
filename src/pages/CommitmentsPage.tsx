import { useState } from 'react';
import type { Commitment } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, Hint, Panel, PanelTitle, SectionHeader } from '@/components/ui/Surface';
import { CommitmentFormDialog } from '@/features/commitments/CommitmentFormDialog';
import { CommitmentItem } from '@/features/commitments/CommitmentItem';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction, toast } from '@/stores/uiStore';

type FormState = { commitment: Commitment | null } | null;

export function CommitmentsPage() {
  const commitments = usePlannerStore(s => s.data.commitments);
  const { setCommitmentDone, deleteItem } = usePlannerStore.getState();
  const [form, setForm] = useState<FormState>(null);
  const active = commitments.filter(c => !c.done);
  const done = commitments.filter(c => c.done);

  const toggleDone = (c: Commitment) => {
    void setCommitmentDone(c.id, !c.done);
    if (!c.done) toast('مبروك! نُقلت إلى المنجز');
  };
  const remove = async (id: string) => {
    if (await confirmAction('هل تريد حذف هذا العنصر؟')) void deleteItem('commitments', id);
  };
  const renderItem = (c: Commitment) => (
    <CommitmentItem key={c.id} commitment={c} onToggleDone={() => toggleDone(c)} onEdit={() => setForm({ commitment: c })} onDelete={() => void remove(c.id)} />
  );

  return (
    <section>
      <SectionHeader
        title="التزاماتي ومهامي"
        description="اكتب المطلوب، أرفق ملف PDF، وانقل المهمة للمنجز عند إتمامها."
        action={
          <Button variant="primary" onClick={() => setForm({ commitment: null })}>
            ＋ أضف التزامًا
          </Button>
        }
      />
      <Panel>
        <PanelTitle>قيد التنفيذ</PanelTitle>
        <div className="grid gap-2">{active.length ? active.map(renderItem) : <EmptyState>لا توجد التزامات قيد التنفيذ.</EmptyState>}</div>
      </Panel>
      <Panel className="mt-[14px]">
        <PanelTitle>تم إنجازه ✓</PanelTitle>
        <div className="grid gap-2">{done.length ? done.map(renderItem) : <Hint>المهام التي تنهيها ستظهر هنا.</Hint>}</div>
      </Panel>
      {form && <CommitmentFormDialog key={form.commitment?.id ?? 'new'} commitment={form.commitment} onClose={() => setForm(null)} />}
    </section>
  );
}
