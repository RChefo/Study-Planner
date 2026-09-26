import { useId, useState } from 'react';
import type { ClassType, Course, DayId, EntryColor, TimetableEntry, TimetableProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, Select, TextArea, TextInput, inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { confirmAction, toast } from '@/stores/uiStore';
import { CLASS_TYPES, DAY_LABEL, ENTRY_COLORS, addEntry, conflictsWith, deleteEntry, duplicateEntry, orderedDays, toMin, updateEntry, validateEntry, type EntryDraft, type EntryErrors, type TimetableState } from '../builder';
import { entryTitle, newId } from './useTimetable';
import { TONES } from './tones';

export type EntryDialogState = { mode: 'add'; day: DayId; start?: string; end?: string; periodId?: string | null; kind?: 'class' | 'break' } | { mode: 'edit'; entry: TimetableEntry };

const chip = (on: boolean) =>
  cn('rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-brand-night bg-brand-night font-semibold text-dawn' : 'border-line bg-white text-subtle hover:text-ink');

/** Add or edit a class/break. Basic fields first; details are one click away and all optional. */
export function EntryDialog({ state, profile, courses, run, onClose }: { state: EntryDialogState; profile: TimetableProfile; courses: Course[]; run: (fn: (s: TimetableState) => TimetableState) => Promise<void>; onClose: () => void }) {
  const editing = state.mode === 'edit' ? state.entry : null;
  const periods = profile.mode === 'periods' ? profile.periods : [];
  const initialPeriod = editing?.periodId ?? (state.mode === 'add' ? state.periodId : null) ?? null;
  const first = initialPeriod ? periods.find(p => p.id === initialPeriod) : undefined;

  const [kind, setKind] = useState<'class' | 'break'>(editing?.kind ?? (state.mode === 'add' ? (state.kind ?? 'class') : 'class'));
  const [courseId, setCourseId] = useState(editing?.courseId ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [day, setDay] = useState<DayId>(editing?.day ?? (state.mode === 'add' ? state.day : 'sun'));
  const [periodId, setPeriodId] = useState<string>(first?.id ?? '');
  const [start, setStart] = useState(editing?.start ?? first?.start ?? (state.mode === 'add' ? (state.start ?? '09:00') : '09:00'));
  const [end, setEnd] = useState(editing?.end ?? first?.end ?? (state.mode === 'add' ? (state.end ?? '10:00') : '10:00'));
  const [type, setType] = useState<ClassType | ''>(editing?.type ?? '');
  const [group, setGroup] = useState(editing?.group ?? '');
  const [instructor, setInstructor] = useState(editing?.instructor ?? '');
  const [room, setRoom] = useState(editing?.room ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [color, setColor] = useState<EntryColor | ''>(editing?.color ?? '');
  const [more, setMore] = useState(!!(editing && (editing.type || editing.group || editing.instructor || editing.room || editing.notes || editing.color)));
  const [errors, setErrors] = useState<EntryErrors>({});
  const groupsId = useId();

  const days = orderedDays(profile);
  if (!days.includes(day)) days.push(day);
  const isBreak = kind === 'break';

  const draft: EntryDraft = {
    kind,
    day,
    start,
    end,
    title: title.trim().slice(0, 120),
    courseId: !isBreak && courseId ? courseId : null,
    type: !isBreak && type ? type : null,
    ...(!isBreak && group.trim() ? { group: group.trim().slice(0, 60) } : {}),
    ...(!isBreak && instructor.trim() ? { instructor: instructor.trim().slice(0, 120) } : {}),
    ...(!isBreak && room.trim() ? { room: room.trim().slice(0, 80) } : {}),
    ...(notes.trim() ? { notes: notes.trim().slice(0, 1000) } : {}),
    color: color || null,
    periodId: periodId || null,
  };
  const clashes = conflictsWith(profile, draft, editing?.id);

  const pickPeriod = (id: string) => {
    setPeriodId(id);
    const pe = periods.find(p => p.id === id);
    if (pe) {
      setStart(pe.start);
      setEnd(pe.end);
    }
  };

  const save = async () => {
    const found = validateEntry(draft, courses.map(c => c.id));
    setErrors(found);
    if (Object.keys(found).length) return;
    if (editing) await run(s => updateEntry(s, profile.id, editing.id, { ...draft, group: draft.group ?? '', instructor: draft.instructor ?? '', room: draft.room ?? '', notes: draft.notes ?? '' }, Date.now()));
    else await run(s => addEntry(s, profile.id, { ...draft, id: newId() }, Date.now()));
    toast(clashes.length ? 'تم الحفظ — مع وجود تعارض في المواعيد' : editing ? 'تم حفظ التعديلات' : isBreak ? 'تمت إضافة الاستراحة' : 'تمت إضافة الحصة', clashes.length ? 'info' : 'success');
    onClose();
  };

  const duplicate = async () => {
    if (!editing) return;
    await run(s => duplicateEntry(s, profile.id, editing.id, newId(), Date.now()));
    toast('تم إنشاء نسخة في اليوم نفسه — عدّلها لنقلها', 'success');
    onClose();
  };
  const remove = async () => {
    if (!editing) return;
    const ok = await confirmAction(`حذف «${entryTitle(editing, courses)}» من الجدول؟`, { title: 'حذف من الجدول', confirmLabel: 'حذف', danger: true });
    if (!ok) return;
    await run(s => deleteEntry(s, profile.id, editing.id, Date.now()));
    toast('تم الحذف', 'success');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={editing ? (isBreak ? 'تعديل الاستراحة' : 'تعديل الحصة') : isBreak ? 'إضافة استراحة' : 'إضافة إلى الجدول'} className="sm:w-[min(560px,100%)]">
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          void save();
        }}
        className="space-y-5"
      >
        <Segmented
          label="النوع"
          value={kind}
          onChange={setKind}
          options={[
            ['class', 'حصة'],
            ['break', 'استراحة'],
          ]}
        />

        {!isBreak && (
          <Field label="المادة" hint={courses.length ? undefined : 'لا مواد بعد — يمكنك كتابة اسم الحصة مباشرة.'} error={errors.courseId}>
            {props => (
              <Select {...props} value={courseId} onChange={e => setCourseId(e.target.value)}>
                <option value="">بدون مادة</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label={isBreak ? 'اسم الاستراحة' : courseId ? 'اسم الحصة (اختياري)' : 'اسم الحصة'} error={errors.title}>
          {props => (
            <TextInput
              {...props}
              data-autofocus
              value={title}
              maxLength={120}
              onChange={e => setTitle(e.target.value)}
              placeholder={isBreak ? 'مثال: غداء' : (courses.find(c => c.id === courseId)?.name ?? 'مثال: Java — محاضرة')}
            />
          )}
        </Field>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium text-ink">اليوم</legend>
          <div className="flex flex-wrap gap-1.5">
            {days.map(d => (
              <button key={d} type="button" aria-pressed={d === day} onClick={() => setDay(d)} className={chip(d === day)}>
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
        </fieldset>

        {periods.length > 0 && (
          <Field label="الفترة">
            {props => (
              <Select {...props} value={periodId} onChange={e => pickPeriod(e.target.value)}>
                <option value="">وقت مخصص</option>
                {[...periods]
                  .sort((a, b) => toMin(a.start) - toMin(b.start))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.start}–{p.end}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="من" error={errors.start}>
            {props => (
              <TextInput
                {...props}
                type="time"
                dir="ltr"
                step={300}
                value={start}
                onChange={e => {
                  setStart(e.target.value);
                  setPeriodId('');
                }}
              />
            )}
          </Field>
          <Field label="إلى" error={errors.end}>
            {props => (
              <TextInput
                {...props}
                type="time"
                dir="ltr"
                step={300}
                value={end}
                onChange={e => {
                  setEnd(e.target.value);
                  setPeriodId('');
                }}
              />
            )}
          </Field>
        </div>

        {clashes.length > 0 && (
          <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-[#f8ebe0] px-3 py-2.5 text-[13px] leading-relaxed text-[#7a3413]">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            <span>
              يوجد تعارض في المواعيد مع: {clashes.map(c => `${entryTitle(c, courses)} (${c.start}–${c.end})`).join('، ')}. يمكنك الحفظ على أي حال.
            </span>
          </p>
        )}

        <div>
          <button type="button" aria-expanded={more} onClick={() => setMore(m => !m)} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
            <Icon name="chevronDown" size={15} className={cn('transition-transform', more && 'rotate-180')} /> تفاصيل أكثر (اختيارية)
          </button>
          {more && (
            <div className="mt-4 space-y-4">
              {!isBreak && (
                <>
                  <fieldset className="mx-0 min-w-0 border-0 p-0">
                    <legend className="mb-2 p-0 text-[13px] font-medium text-ink">نوع الحصة</legend>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" aria-pressed={!type} onClick={() => setType('')} className={chip(!type)}>
                        بدون
                      </button>
                      {CLASS_TYPES.map(t => (
                        <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={chip(type === t.id)}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="المجموعة" hint={profile.groups.length ? 'اختر من مجموعاتك أو اكتب اسمًا جديدًا' : 'اكتب أي اسم: Group A، Section 4، Lab 2…'}>
                      {props => (
                        <>
                          <input {...props} list={groupsId} value={group} maxLength={60} onChange={e => setGroup(e.target.value)} className={inputClass} placeholder="Group A" />
                          <datalist id={groupsId}>
                            {profile.groups.map(g => (
                              <option key={g} value={g} />
                            ))}
                          </datalist>
                        </>
                      )}
                    </Field>
                    <Field label="المكان">{props => <TextInput {...props} value={room} maxLength={80} onChange={e => setRoom(e.target.value)} placeholder="Hall 4" />}</Field>
                  </div>
                  <Field label="الدكتور / المحاضر">{props => <TextInput {...props} value={instructor} maxLength={120} onChange={e => setInstructor(e.target.value)} />}</Field>
                </>
              )}
              <Field label="ملاحظات">{props => <TextArea {...props} rows={2} value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} />}</Field>
              <fieldset className="mx-0 min-w-0 border-0 p-0">
                <legend className="mb-2 p-0 text-[13px] font-medium text-ink">اللون</legend>
                <div className="flex flex-wrap gap-2">
                  {(['', ...ENTRY_COLORS] as const).map(c => {
                    const tone = TONES[c || 'default'];
                    return (
                      <button
                        key={c || 'default'}
                        type="button"
                        aria-pressed={color === c}
                        aria-label={c ? tone.label : 'اللون الافتراضي'}
                        onClick={() => setColor(c)}
                        className={cn('grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-white transition', tone.swatch, color === c ? 'ring-2 ring-[#c19a4f]' : 'hover:scale-105')}
                      >
                        {color === c && <Icon name="check" size={14} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        <DialogActions>
          <Button type="submit" variant="primary">
            {editing ? 'حفظ' : 'إضافة'}
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
          {editing && (
            <span className="me-auto flex gap-1">
              <Button variant="ghost" onClick={() => void duplicate()}>
                <Icon name="plus" size={14} /> نسخة
              </Button>
              <Button variant="danger" onClick={() => void remove()}>
                <Icon name="trash" size={14} /> حذف
              </Button>
            </span>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
