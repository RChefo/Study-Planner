import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Progress, StatusChip } from '@/components/ui/Card';
import { Field, TextInput, inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { previewAttachment, saveAttachment } from '@/components/previewAttachment';
import { CourseFormDialog } from '@/features/courses/CourseFormDialog';
import { readPdf } from '@/features/courses/readPdf';
import { useCourseInfos, useMinuteNow } from '@/features/insights/hooks';
import type { LectureInfo, LectureStatus } from '@/features/insights/selectors';
import { startLectureStudy } from '@/features/timer/timerController';
import { formatMinutes, relativeDay } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { ROUTES } from '@/routes/paths';

const STATUS: Record<LectureStatus, { tone: 'done' | 'progress' | 'idle'; label: string; icon: 'checkCircle' | 'clock' | 'circle' }> = {
  done: { tone: 'done', label: 'مكتملة', icon: 'checkCircle' },
  'in-progress': { tone: 'progress', label: 'قيد المذاكرة', icon: 'clock' },
  'not-started': { tone: 'idle', label: 'لم تبدأ', icon: 'circle' },
};

type Filter = 'all' | 'open' | 'done';

function AddLectureForm({ courseId, existing }: { courseId: string; existing: string[] }) {
  const addLecture = usePlannerStore(s => s.addLecture);
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
    if (existing.includes(trimmed)) {
      setNameError('توجد محاضرة بهذا الاسم في المادة');
      return;
    }
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      let pdf: string | undefined;
      if (file) {
        const read = await readPdf(file);
        if ('error' in read) {
          setFileError(read.error);
          return;
        }
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
    <form
      noValidate
      className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
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
        {props => <input {...props} ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={() => setFileError(null)} className={cn(inputClass, 'py-1.5 file:me-3 file:rounded-md file:border-0 file:bg-mint file:px-2.5 file:py-1 file:text-brand')} />}
      </Field>
      <Button type="submit" variant="primary" loading={busy} className="sm:mt-[26px]">
        <Icon name="plus" size={15} /> إضافة
      </Button>
    </form>
  );
}

function LectureRow({ courseId, courseName, lecture, now }: { courseId: string; courseName: string; lecture: LectureInfo; now: number }) {
  const navigate = useNavigate();
  const topic = usePlannerStore(s => s.data.courses.find(c => c.id === courseId)?.topics?.[lecture.index]);
  const { toggleLecture, deleteLecture, setLectureFile } = usePlannerStore.getState();
  const timerActive = useTimerStore(s => s.timer.active);
  const fileRef = useRef<HTMLInputElement>(null);
  const status = STATUS[lecture.status];

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

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <input
        type="checkbox"
        checked={lecture.status === 'done'}
        onChange={() => void toggleLecture(courseId, lecture.index)}
        aria-label={`تمت مذاكرة ${lecture.name}`}
        className="size-[18px] shrink-0 cursor-pointer accent-brand"
      />
      <div className="min-w-0 flex-1 basis-48">
        <p className={cn('m-0 truncate text-sm font-medium', lecture.status === 'done' ? 'text-subtle line-through decoration-[#b9c4be]' : 'text-ink')}>{lecture.name}</p>
        <p className="m-0 mt-0.5 text-xs text-subtle">
          {lecture.minutes ? `${formatMinutes(lecture.minutes)} مذاكرة` : 'لا توجد جلسات بعد'}
          {lecture.lastStudiedAt ? ` · آخر مرة ${relativeDay(lecture.lastStudiedAt, now)}` : ''}
        </p>
      </div>
      <StatusChip tone={status.tone} icon={status.icon}>
        {status.label}
      </StatusChip>
      <div className="flex flex-wrap items-center gap-1">
        {topic?.pdf ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => previewAttachment(topic.pdf)} aria-label={`معاينة ملف ${lecture.name}`}>
              <Icon name="eye" size={15} /> معاينة
            </Button>
            <Button size="icon" variant="ghost" onClick={() => saveAttachment(topic.pdf, topic.pdfName ?? `${lecture.name}.pdf`)} aria-label={`تنزيل ملف ${lecture.name}`}>
              <Icon name="download" size={15} />
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} aria-label={`إرفاق ملف PDF لـ ${lecture.name}`}>
              <Icon name="file" size={15} /> إرفاق
            </Button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e => void attach(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
          </>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={timerActive}
          title={timerActive ? 'هناك جولة جارية' : undefined}
          onClick={() => startLectureStudy(courseId, lecture.index) && navigate(ROUTES.timer)}
          aria-label={`ابدأ مذاكرة ${lecture.name} في ${courseName}`}
        >
          <Icon name="play" size={14} /> ابدأ
        </Button>
        <Button size="icon" variant="ghost" onClick={() => void remove()} aria-label={`حذف ${lecture.name}`}>
          <Icon name="trash" size={15} />
        </Button>
      </div>
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
  const [filter, setFilter] = useState<Filter>('all');

  const lectures = useMemo(() => {
    if (!info) return [];
    if (filter === 'open') return info.lectures.filter(l => l.status !== 'done');
    if (filter === 'done') return info.lectures.filter(l => l.status === 'done');
    return info.lectures;
  }, [info, filter]);

  if (!info) {
    return (
      <Card>
        <EmptyState icon="folder" title="المادة غير موجودة" description="ربما حُذفت أو تغيّر الرابط." action={<ButtonLink to={ROUTES.courses}>العودة إلى المواد</ButtonLink>} />
      </Card>
    );
  }

  const removeCourse = async () => {
    const ok = await confirmAction(`سيتم حذف «${info.course.name}» و${info.total} محاضرة داخلها.`, { title: 'حذف المادة', confirmLabel: 'حذف المادة', danger: true });
    if (!ok) return;
    await deleteItem('courses', info.course.id);
    toast('تم حذف المادة', 'success');
    navigate(ROUTES.courses, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Link to={ROUTES.courses} className="inline-flex items-center gap-1 text-[13px] text-subtle no-underline hover:text-ink">
        <Icon name="chevron" size={15} /> المواد الدراسية
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="m-0 truncate text-2xl font-bold tracking-tight text-ink">{info.course.name}</h1>
            <p className="m-0 mt-1 text-sm text-subtle">
              {info.done}/{info.total} محاضرة مكتملة · {formatMinutes(info.minutes)} مذاكرة
              {info.lastStudiedAt ? ` · آخر مذاكرة ${relativeDay(info.lastStudiedAt, now)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {info.nextLecture && (
              <Button variant="primary" disabled={timerActive} onClick={() => startLectureStudy(info.course.id, info.nextLecture!.index) && navigate(ROUTES.timer)}>
                <Icon name="play" size={15} /> ذاكر: {info.nextLecture.name.length > 24 ? `${info.nextLecture.name.slice(0, 24)}…` : info.nextLecture.name}
              </Button>
            )}
            <Button size="icon" onClick={() => setRenaming(true)} aria-label="تعديل اسم المادة">
              <Icon name="edit" size={16} />
            </Button>
            <Button size="icon" variant="danger" onClick={() => void removeCourse()} aria-label="حذف المادة">
              <Icon name="trash" size={16} />
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={info.percent} label={`تقدّم ${info.course.name}`} className="flex-1" />
          <span className="text-sm font-semibold text-brand">{info.percent}%</span>
        </div>
      </Card>

      <Card aria-labelledby="lectures-title">
        <CardHeader
          id="lectures-title"
          title="المحاضرات"
          description={`${info.remaining} متبقية`}
          action={
            <div role="radiogroup" aria-label="تصفية المحاضرات" className="flex rounded-lg border border-line p-0.5 text-[13px]">
              {(
                [
                  ['all', 'الكل'],
                  ['open', 'غير مكتملة'],
                  ['done', 'مكتملة'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn('rounded-md px-2.5 py-1 transition-colors', filter === value ? 'bg-mint font-semibold text-brand-deep' : 'text-subtle hover:text-ink')}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <AddLectureForm courseId={info.course.id} existing={info.lectures.map(l => l.name)} />
        {lectures.length ? (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {lectures.map(l => (
              <LectureRow key={`${l.index}-${l.name}`} courseId={info.course.id} courseName={info.course.name} lecture={l} now={now} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="book"
            title={info.total ? 'لا محاضرات في هذا التصنيف' : 'لا توجد محاضرات بعد'}
            description={info.total ? undefined : 'أضف أول محاضرة من النموذج أعلاه.'}
          />
        )}
      </Card>

      {renaming && <CourseFormDialog course={info.course} onClose={() => setRenaming(false)} />}
    </div>
  );
}
