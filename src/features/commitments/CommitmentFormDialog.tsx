import { useRef, useState } from 'react';
import type { Commitment } from '@/types';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, FieldGrid, TextArea, TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { blobToDataUrl, isPdfFile } from '@/lib/files';
import { uid } from '@/lib/id';
import { usePlannerStore } from '@/stores/plannerStore';
import { toast } from '@/stores/uiStore';

/** Add or edit a commitment. Mount with a `key` so the form resets per item. */
export function CommitmentFormDialog({ commitment, onClose }: { commitment: Commitment | null; onClose: () => void }) {
  const [name, setName] = useState(commitment?.name ?? '');
  const [dueDate, setDueDate] = useState(commitment?.dueDate ?? '');
  const [description, setDescription] = useState(commitment?.description ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const saveCommitment = usePlannerStore(s => s.saveCommitment);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast('اكتب اسم الالتزام');
    const file = fileRef.current?.files?.[0];
    if (file && !isPdfFile(file)) return toast('اختر ملف PDF');
    const next: Commitment = { ...(commitment ?? {}), id: commitment?.id ?? uid(), name: trimmed, dueDate, description: description.trim() };
    if (file) {
      next.pdfName = file.name;
      next.pdf = await blobToDataUrl(file);
    }
    onClose();
    void saveCommitment(next);
    toast('تم حفظ الالتزام');
  };

  return (
    <Dialog open onClose={onClose} title={commitment ? 'تعديل الالتزام' : 'إضافة التزام'}>
      <form
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
      >
        <FieldGrid>
          <Field full label="اسم المهمة / الالتزام">
            {id => <TextInput id={id} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: تسليم بحث مادة الأحياء" />}
          </Field>
          <Field full label="موعد التسليم">
            {id => <TextInput id={id} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />}
          </Field>
          <Field full label="وصف المطلوب">
            {id => (
              <TextArea
                id={id}
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب تفاصيل المهمة أو التعليمات المطلوبة"
              />
            )}
          </Field>
          <Field
            full
            label={`إرفاق ملف PDF ${commitment?.pdf ? '(اختياري، اختر ملفًا جديدًا للاستبدال)' : ''}`}
            hint={commitment?.pdf ? `مرفق حاليًا: ${commitment.pdfName ?? ''}` : 'يمكنك إرفاق ملف التعليمات أو ورقة العمل.'}
          >
            {id => <input ref={fileRef} id={id} type="file" accept="application/pdf,.pdf" className="w-full rounded-[9px] border border-line bg-white p-[10px]" />}
          </Field>
        </FieldGrid>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary">
            حفظ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
