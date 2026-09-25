import { useState } from 'react';
import type { Course } from '@/types';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { usePlannerStore } from '@/stores/plannerStore';
import { toast } from '@/stores/uiStore';

/** Add a course, or rename `course` when given. Mount with a `key` to reset. */
export function CourseFormDialog({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const [name, setName] = useState(course?.name ?? '');
  const saveCourse = usePlannerStore(s => s.saveCourse);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast('اكتب اسم المادة أولًا');
    onClose();
    void saveCourse(course?.id ?? null, trimmed);
    toast('تم حفظ المادة');
  };

  return (
    <Dialog open onClose={onClose} title={course ? 'تعديل اسم المادة' : 'إضافة مادة'}>
      <form
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="اسم المادة">
          {id => <TextInput id={id} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: برمجة Java" />}
        </Field>
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
