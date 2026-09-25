import { useRef, useState } from 'react';
import type { Lecture } from '@/types';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, TextInput } from '@/components/ui/Field';
import { Button, IconButton, MiniButton } from '@/components/ui/Button';
import { Badge, Hint } from '@/components/ui/Surface';
import { Icon } from '@/components/ui/Icon';
import { AttachmentActions } from '@/components/AttachmentActions';
import { blobToDataUrl, isPdfFile } from '@/lib/files';
import { usePlannerStore } from '@/stores/plannerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { startLectureStudy } from '@/features/timer/timerController';

/** A course "folder": add lectures (with optional PDF), tick them off, start the timer. */
export function CourseFolderDialog({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const course = usePlannerStore(s => s.data.courses.find(c => c.id === courseId));
  const { addLecture, toggleLecture, deleteLecture } = usePlannerStore.getState();
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!course) return null;
  const lectures = course.topics ?? [];

  const add = async () => {
    const trimmed = name.trim();
    const file = fileRef.current?.files?.[0];
    if (!trimmed) return toast('اكتب اسم المحاضرة');
    if (file && !isPdfFile(file)) return toast('اختر ملف PDF');
    const lecture: Lecture = { name: trimmed, done: false };
    if (file) {
      lecture.pdfName = file.name;
      lecture.pdf = await blobToDataUrl(file);
    }
    await addLecture(courseId, lecture);
    setName('');
    if (fileRef.current) fileRef.current.value = '';
    nameRef.current?.focus();
  };

  const remove = async (index: number) => {
    if (await confirmAction('حذف هذه المحاضرة؟')) void deleteLecture(courseId, index);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        <>
          <Icon name="folder" size={20} /> {course.name}
        </>
      }
    >
      <Hint className="-mt-2 mb-3">أضف محاضرات المادة، وارفق ملفاتها، وحدد ما ذاكرته.</Hint>
      <form
        className="grid items-end gap-3"
        onSubmit={e => {
          e.preventDefault();
          void add();
        }}
      >
        <Field label="اسم المحاضرة">
          {id => (
            <TextInput ref={nameRef} id={id} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: المحاضرة الأولى — المتغيرات" />
          )}
        </Field>
        <Field label="ملف المحاضرة PDF (اختياري)">
          {id => <input ref={fileRef} id={id} type="file" accept="application/pdf,.pdf" className="w-full rounded-[9px] border border-line bg-white p-[10px]" />}
        </Field>
        <Button type="submit" variant="primary">
          ＋ إضافة محاضرة
        </Button>
      </form>

      <ul className="m-0 mt-[15px] list-none p-0">
        {lectures.length ? (
          lectures.map((t, i) => (
            <li key={`${i}-${t.name}`} className="flex flex-wrap items-center gap-2 border-t border-[#f0f2ef] py-1.5 text-[13px]">
              <input aria-label="تمت مذاكرة المحاضرة" type="checkbox" className="accent-brand" checked={t.done} onChange={() => void toggleLecture(courseId, i)} />
              <span className={t.done ? 'flex-1 text-[#8a9690] line-through' : 'flex-1'}>{t.name}</span>
              <IconButton accent onClick={() => startLectureStudy(courseId, i)}>
                <Icon name="play" size={14} /> ابدأ
              </IconButton>
              {t.pdf && <AttachmentActions compact data={t.pdf} fileName={t.pdfName} fallbackName="lecture.pdf" />}
              <MiniButton title="حذف المحاضرة" aria-label="حذف المحاضرة" onClick={() => void remove(i)}>
                <Icon name="close" size={15} />
              </MiniButton>
              <Badge>{t.done ? 'تمت مذاكرتها' : 'لم تُذاكر بعد'}</Badge>
            </li>
          ))
        ) : (
          <li className="text-xs leading-[1.7] text-muted">لا توجد محاضرات بعد. أضف أول محاضرة من الأعلى.</li>
        )}
      </ul>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
