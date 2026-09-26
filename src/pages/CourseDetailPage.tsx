import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Progress, SectionHeader } from '@/components/ui/Card';
import { CompleteToggle } from '@/components/ui/CompleteToggle';
import { Field, TextInput, inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { previewAttachment, saveAttachment } from '@/components/previewAttachment';
import { CourseFormDialog } from '@/features/courses/CourseFormDialog';
import { readPdf } from '@/features/courses/readPdf';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import type { CourseInfo, LectureInfo } from '@/features/insights/selectors';
import { startLectureStudy } from '@/features/timer/timerController';
import { formatMinutes, lecturesPhrase, relativeDay } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { ROUTES } from '@/routes/paths';

type Stage = 'done' | 'current' | 'next' | 'later';

/** Where each lecture sits on the path: done, the one to study now, the one after, the rest. */
function stages(info: CourseInfo): Map<number, Stage> {
  const map = new Map<number, Stage>();
  const current = info.nextLecture?.index ?? -1;
  let nextAssigned = false;
  for (const l of info.lectures) {
    if (l.status === 'done') map.set(l.index, 'done');
    else if (l.index === current) map.set(l.index, 'current');
    else if (!nextAssigned && current >= 0) {
      map.set(l.index, 'next');
      nextAssigned = true;
    } else map.set(l.index, 'later');
  }
  return map;
}

function LectureStep({ courseId, courseName, lecture, stage, now, last }: { courseId: string; courseName: string; lecture: LectureInfo; stage: Stage; now: number; last: boolean }) {
  const navigate = useNavigate();
  const topic = usePlannerStore(s => s.data.courses.find(c => c.id === courseId)?.topics?.[lecture.index]);
  const { toggleLecture, deleteLecture, setLectureFile } = usePlannerStore.getState();
  const timerActive = useTimerStore(s => s.timer.active);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = stage === 'current';
  const done = stage === 'done';

  const attach = async (file: File | undefined) => {
    if (!file) return;
    const read = await readPdf(file);
    if ('error' in read) return toast(read.error, 'error');
    await setLectureFile(courseId, lecture.index, { pdf: read.data, pdfName: file.name });
    toast('تم إرفاق الملف', 'success');
  };
  const remove = async () => {
    const ok = await confirmAction(`حذف المحاضرة «${lecture.name}»؟`, { title: 'حذف المحاضرة', confirmLabel: 'حذف', danger: true });
    if (ok) await deleteLecture(courseId, lecture.index);
  };
  const toggle = async () => {
    await toggleLecture(courseId, lecture.index);
    if (!done) toast('خطوة أخرى في المسار ✓', 'success');
  };
  const start = () => startLectureStudy(courseId, lecture.index) && navigate(ROUTES.timer);

  return (
    <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
      {/* the path segment to the next step: solid once this lecture is done */}
      {!last && <span aria-hidden="true" className={cn('absolute start-[calc(1.25rem-1px)] top-9 -bottom-1 w-0.5 rounded-full', done ? 'bg-brand' : 'bg-[repeating-linear-gradient(to_bottom,#cdd6cf_0_6px,transparent_6px_12px)]')} />}
      <div className="flex items-start justify-center pt-1">
        <span className={cn('relative grid place-items-center rounded-full', current && 'bg-brand-bright/15 p-1.5 ring-1 ring-brand-bright/30')}>
          <CompleteToggle checked={done} onChange={() => void toggle()} label={`تمت مذاكرة ${lecture.name}`} size={current ? 'md' : 'sm'} />
        </span>
      </div>

      <div className={cn('mb-3 min-w-0 rounded-2xl pb-5', current ? 'border border-line bg-white p-5 shadow-[0_1px_2px_#0d2a200d] sm:p-6' : 'pt-1')}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {(current || stage === 'next') && (
              <p className={cn('m-0 mb-1 text-xs font-semibold', current ? 'text-brand' : 'text-muted')}>{current ? (lecture.status === 'in-progress' ? 'تكمل الآن' : 'الخطوة الحالية') : 'بعدها'}</p>
            )}
            <p
              lang={langOf(lecture.name)}
              className={cn('m-0 [overflow-wrap:anywhere]', current ? 'font-display text-[1.75rem] leading-snug text-brand-night' : 'text-[15px] font-semibold', done ? 'text-subtle' : !current && 'text-ink')}
            >
              {lecture.name}
            </p>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-subtle">
              {lecture.minutes ? <span>{formatMinutes(lecture.minutes)} مذاكرة</span> : !done && <span>لم تُذاكر بعد</span>}
              {lecture.lastStudiedAt && <span>آخر مرة {relativeDay(lecture.lastStudiedAt, now)}</span>}
              {topic?.pdf && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="file" size={13} /> PDF
                </span>
              )}
              {done && <span className="text-brand">منجزة</span>}
            </p>
          </div>
          <Menu
            label={`خيارات ${lecture.name}`}
            items={[
              ...(topic?.pdf
                ? [
                    { label: 'معاينة الملف', icon: 'eye' as const, onSelect: () => previewAttachment(topic.pdf) },
                    { label: 'تنزيل الملف', icon: 'download' as const, onSelect: () => saveAttachment(topic.pdf, topic.pdfName ?? `${lecture.name}.pdf`) },
                    { label: 'إزالة الملف', icon: 'close' as const, onSelect: () => void setLectureFile(courseId, lecture.index, null) },
                  ]
                : [{ label: 'إرفاق ملف PDF', icon: 'file' as const, onSelect: () => fileRef.current?.click() }]),
              { label: 'حذف المحاضرة', icon: 'trash', onSelect: () => void remove(), danger: true },
            ]}
          />
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e => void attach(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
        </div>

        {current && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="lg" disabled={timerActive} title={timerActive ? 'هناك جولة جارية' : undefined} onClick={start} aria-label={`ابدأ مذاكرة ${lecture.name} في ${courseName}`}>
              <Icon name="play" size={15} /> ابدأ المذاكرة
            </Button>
            {topic?.pdf && (
              <Button size="lg" onClick={() => previewAttachment(topic.pdf)}>
                <Icon name="eye" size={15} /> افتح الملف
              </Button>
            )}
          </div>
        )}
        {!current && !done && (
          <button type="button" disabled={timerActive} onClick={start} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline disabled:opacity-40" aria-label={`ابدأ مذاكرة ${lecture.name}`}>
            <Icon name="play" size={12} /> ذاكرها الآن
          </button>
        )}
      </div>
    </li>
  );
}

function AddLecture({ courseId, existing, first }: { courseId: string; existing: string[]; first: boolean }) {
  const addLecture = usePlannerStore(s => s.addLecture);
  const [open, setOpen] = useState(first);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('اكتب اسم المحاضرة');
      nameRef.current?.focus();
      return;
    }
    if (existing.includes(trimmed)) return setNameError('توجد محاضرة بهذا الاسم في المادة');
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      let pdf: string | undefined;
      if (file) {
        const read = await readPdf(file);
        if ('error' in read) return setFileError(read.error);
        pdf = read.data;
      }
      await addLecture(courseId, { name: trimmed, done: false, ...(pdf ? { pdf, pdfName: file!.name } : {}) });
      setName('');
      if (fileRef.current) fileRef.current.value = '';
      toast('تمت إضافة المحاضرة', 'success');
      nameRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
      <div className="flex justify-center pt-1">
        <span className="grid size-6 place-items-center rounded-full border-[1.5px] border-dashed border-brand/50 text-brand">
          <Icon name="plus" size={13} />
        </span>
      </div>
      {open ? (
        <form
          noValidate
          className="grid gap-3 rounded-2xl border border-dashed border-[#cfd9d2] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label="محاضرة جديدة" error={nameError}>
            {props => (
              <TextInput
                {...props}
                ref={nameRef}
                autoFocus={!first}
                value={name}
                maxLength={300}
                onChange={e => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="مثال: المحاضرة 3 — الجدران النارية"
              />
            )}
          </Field>
          <Field label="ملف PDF (اختياري)" error={fileError}>
            {props => <input {...props} ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={() => setFileError(null)} className={cn(inputClass, 'py-1.5 file:me-3 file:rounded-full file:border-0 file:bg-mint file:px-3 file:py-1 file:text-brand')} />}
          </Field>
          <Button type="submit" variant="primary" loading={busy} className="sm:mt-[26px]">
            <Icon name="plus" size={15} /> إضافة
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="justify-self-start pt-1.5 text-sm font-medium text-brand hover:underline">
          أضف محاضرة إلى المسار
        </button>
      )}
    </li>
  );
}

export function CourseDetailPage() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const infos = useCourseInfos();
  const now = useMinuteNow();
  const info = infos.find(i => i.course.id === courseId);
  const deleteItem = usePlannerStore(s => s.deleteItem);
  const timerActive = useTimerStore(s => s.timer.active);
  const [renaming, setRenaming] = useState(false);

  if (!info) {
    return <EmptyState icon="folder" title="المادة غير موجودة" description="ربما حُذفت أو تغيّر الرابط." action={<ButtonLink to={ROUTES.courses}>العودة إلى المواد</ButtonLink>} />;
  }

  const removeCourse = async () => {
    const ok = await confirmAction(`سيتم حذف «${info.course.name}» و${info.total} محاضرة داخلها.`, { title: 'حذف المادة', confirmLabel: 'حذف المادة', danger: true });
    if (!ok) return;
    await deleteItem('courses', info.course.id);
    toast('تم حذف المادة', 'success');
    navigate(ROUTES.courses, { replace: true });
  };
  const stageOf = stages(info);
  const next = info.nextLecture;

  return (
    <div>
      <Link to={ROUTES.courses} className="inline-flex items-center gap-1 text-[13px] text-subtle no-underline hover:text-ink">
        <Icon name="chevron" size={15} /> المواد
      </Link>

      <header className="mb-12 mt-4">
        <div className="flex items-start gap-3">
          <h1 lang={langOf(info.course.name)} className="font-display m-0 min-w-0 flex-1 text-[2.4rem] font-normal leading-[1.2] text-brand-night [overflow-wrap:anywhere] sm:text-[3.2rem]">
            {info.course.name}
          </h1>
          <Menu
            label="خيارات المادة"
            className="mt-2"
            items={[
              { label: 'تعديل الاسم', icon: 'edit', onSelect: () => setRenaming(true) },
              { label: 'حذف المادة', icon: 'trash', onSelect: () => void removeCourse(), danger: true },
            ]}
          />
        </div>
        <p className="m-0 mt-2 text-[15px] text-subtle">
          {info.total ? `${info.done} من ${info.total === 1 ? 'محاضرة واحدة' : lecturesPhrase(info.total)} منجزة` : 'لا محاضرات بعد'}
          {info.minutes ? ` · ${formatMinutes(info.minutes)} مذاكرة` : ''}
          {info.lastStudiedAt ? ` · آخر مذاكرة ${relativeDay(info.lastStudiedAt, now)}` : ''}
        </p>
        <div className="mt-6 flex max-w-2xl items-center gap-4">
          <Progress value={info.percent} label={`تقدّم ${info.course.name}`} className="flex-1" />
          <span className="text-lg font-semibold tabular-nums text-brand">{info.percent}%</span>
        </div>
        {next && (
          <Button variant="night" size="xl" className="mt-7 max-w-full" disabled={timerActive} onClick={() => startLectureStudy(info.course.id, next.index) && navigate(ROUTES.timer)}>
            <Icon name="play" size={15} /> <span className="truncate">ذاكر: {next.name}</span>
          </Button>
        )}
      </header>

      <section aria-labelledby="path-title" className="max-w-3xl">
        <SectionHeader id="path-title" title="مسار التعلّم" count={info.total || undefined} description={info.total ? 'علّم كل محاضرة عند إنجازها؛ يتقدّم المسار معك.' : undefined} className="mb-6" />
        {info.total === 0 && <p className="m-0 mb-6 text-sm text-subtle">ابدأ المسار بإضافة أول محاضرة وملفها إن وُجد.</p>}
        <ol className="m-0 list-none p-0">
          {info.lectures.map((l, i) => (
            <LectureStep key={`${l.index}-${l.name}`} courseId={info.course.id} courseName={info.course.name} lecture={l} stage={stageOf.get(l.index) ?? 'later'} now={now} last={i === info.lectures.length - 1} />
          ))}
          <AddLecture courseId={info.course.id} existing={info.lectures.map(l => l.name)} first={info.total === 0} />
        </ol>
      </section>

      {renaming && <CourseFormDialog course={info.course} onClose={() => setRenaming(false)} />}
    </div>
  );
}
