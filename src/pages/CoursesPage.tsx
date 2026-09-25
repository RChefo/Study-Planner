import { useState } from 'react';
import type { Course } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, SectionHeader } from '@/components/ui/Surface';
import { CourseCard } from '@/features/courses/CourseCard';
import { CourseFolderDialog } from '@/features/courses/CourseFolderDialog';
import { CourseFormDialog } from '@/features/courses/CourseFormDialog';
import { CourseSummary } from '@/features/courses/CourseSummary';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction } from '@/stores/uiStore';

type FormState = { course: Course | null } | null;

export function CoursesPage() {
  const courses = usePlannerStore(s => s.data.courses);
  const deleteItem = usePlannerStore(s => s.deleteItem);
  const [form, setForm] = useState<FormState>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (await confirmAction('هل تريد حذف هذا العنصر؟')) void deleteItem('courses', id);
  };

  return (
    <section>
      <SectionHeader
        title="المواد"
        description="افتح مجلد المادة لإضافة المحاضرات ومذاكرتها مباشرةً."
        action={
          <Button variant="primary" onClick={() => setForm({ course: null })}>
            ＋ أضف مادة
          </Button>
        }
      />
      <CourseSummary courses={courses} />
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        {courses.length ? (
          courses.map(c => (
            <CourseCard key={c.id} course={c} onOpen={() => setFolderId(c.id)} onEdit={() => setForm({ course: c })} onDelete={() => void remove(c.id)} />
          ))
        ) : (
          <EmptyState className="col-span-full">أضف مادة لفتح مجلدها وإضافة المحاضرات.</EmptyState>
        )}
      </div>
      {form && <CourseFormDialog key={form.course?.id ?? 'new'} course={form.course} onClose={() => setForm(null)} />}
      {folderId && <CourseFolderDialog courseId={folderId} onClose={() => setFolderId(null)} />}
    </section>
  );
}
