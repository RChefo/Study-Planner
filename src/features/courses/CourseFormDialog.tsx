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
  const [error, setError] = useState<string | null>(null);
  const courses = usePlannerStore(s => s.data.courses);
  const saveCourse = usePlannerStore(s => s.saveCourse);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('اكتب اسم المادة');
    if (trimmed.length > 200) return setError('الاسم طويل جدًا (200 حرف كحد أقصى)');
    if (courses.some(c => c.id !== course?.id && c.name.trim() === trimmed)) return setError('توجد مادة بهذا الاسم بالفعل');
    onClose();
    void saveCourse(course?.id ?? null, trimmed);
    toast(course ? 'تم تعديل اسم المادة' : 'تمت إضافة المادة', 'success');
  };

  return (
    <Dialog open onClose={onClose} title={course ? 'تعديل اسم المادة' : 'إضافة مادة'} description={course ? undefined : 'ستُنشأ للمادة صفحة تضيف فيها محاضراتها وملفاتها.'}>
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="اسم المادة" error={error}>
          {props => (
            <TextInput
              {...props}
              data-autofocus
              value={name}
              maxLength={200}
              onChange={e => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="مثال: أمن الشبكات"
            />
          )}
        </Field>
        <DialogActions>
          <Button type="submit" variant="primary">
            {course ? 'حفظ' : 'إضافة المادة'}
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
