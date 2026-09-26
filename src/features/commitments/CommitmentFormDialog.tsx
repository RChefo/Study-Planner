import { useRef, useState } from 'react';
import type { Commitment } from '@/types';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, FieldGrid, TextArea, TextInput, inputClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { readPdf } from '@/features/courses/readPdf';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { toast } from '@/stores/uiStore';

/** Add or edit a commitment. Mount with a `key` so the form resets per item. */
export function CommitmentFormDialog({ commitment, onClose }: { commitment: Commitment | null; onClose: () => void }) {
  const [name, setName] = useState(commitment?.name ?? '');
  const [dueDate, setDueDate] = useState(commitment?.dueDate ?? '');
  const [description, setDescription] = useState(commitment?.description ?? '');
  const [errors, setErrors] = useState<{ name?: string; dueDate?: string; file?: string }>({});
  const [busy, setBusy] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveCommitment = usePlannerStore(s => s.saveCommitment);

  const submit = async () => {
    const next: typeof errors = {};
    const trimmed = name.trim();
    if (!trimmed) next.name = 'اكتب اسم الالتزام';
    else if (trimmed.length > 300) next.name = 'الاسم طويل جدًا';
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) next.dueDate = 'تاريخ غير صالح';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const base: Commitment = { ...(commitment ?? {}), id: commitment?.id ?? uid(), name: trimmed, dueDate, description: description.trim().slice(0, 5000) };
      if (removeFile) {
        delete base.pdf;
        delete base.pdfName;
      }
      const file = fileRef.current?.files?.[0];
      if (file) {
        const read = await readPdf(file);
        if ('error' in read) {
          setErrors({ file: read.error });
          return;
        }
        base.pdf = read.data;
        base.pdfName = file.name;
      }
      onClose();
      await saveCommitment(base);
      toast(commitment ? 'تم حفظ التعديلات' : 'تمت إضافة الالتزام', 'success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={commitment ? 'تعديل الالتزام' : 'التزام جديد'}>
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
      >
        <FieldGrid>
          <Field full label="اسم المهمة / الالتزام" error={errors.name}>
            {props => <TextInput {...props} data-autofocus value={name} maxLength={300} onChange={e => setName(e.target.value)} placeholder="مثال: تسليم بحث أمن الشبكات" />}
          </Field>
          <Field label="موعد التسليم (اختياري)" error={errors.dueDate}>
            {props => <TextInput {...props} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />}
          </Field>
          <Field label="ملف PDF (اختياري)" error={errors.file} hint={commitment?.pdf && !removeFile ? `مرفق حاليًا: ${commitment.pdfName ?? 'ملف PDF'} — اختر ملفًا لاستبداله` : undefined}>
            {props => (
              <input
                {...props}
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={() => setErrors(e => ({ ...e, file: undefined }))}
                className={cn(inputClass, 'py-1.5 file:me-3 file:rounded-md file:border-0 file:bg-mint file:px-2.5 file:py-1 file:text-brand')}
              />
            )}
          </Field>
          {commitment?.pdf && (
            <label className="col-span-full -mt-2 flex items-center gap-2 text-[13px] text-subtle">
              <input type="checkbox" checked={removeFile} onChange={e => setRemoveFile(e.target.checked)} className="accent-brand" /> إزالة الملف المرفق
            </label>
          )}
          <Field full label="الوصف (اختياري)">
            {props => <TextArea {...props} rows={3} value={description} maxLength={5000} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل المطلوب أو التعليمات" />}
          </Field>
        </FieldGrid>
        <DialogActions>
          <Button type="submit" variant="primary" loading={busy}>
            {commitment ? 'حفظ' : 'إضافة'}
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
