import { useState } from 'react';
import type { DayId, TimetablePeriod, TimetableProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { confirmAction, toast } from '@/stores/uiStore';
import { DAY_IDS, DAY_LABEL, applyStructure, copyStructure, isTime, orderedDays, suggestPeriod, toMin, validatePeriod, type StructureDraft, type TimetableState } from '../builder';
import { newId } from './useTimetable';

const chip = (on: boolean) =>
  cn('rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-brand-night bg-brand-night font-semibold text-dawn' : 'border-line bg-white text-subtle hover:text-ink');

/** "إعدادات الجدول": change the structure any time without rebuilding the timetable. */
export function SettingsDialog({ profile, others, run, onClose }: { profile: TimetableProfile; others: TimetableProfile[]; run: (fn: (s: TimetableState) => TimetableState) => Promise<void>; onClose: () => void }) {
  const [d, setD] = useState<StructureDraft>(() => ({
    name: profile.name,
    description: profile.description ?? '',
    days: [...profile.days],
    firstDay: profile.firstDay,
    mode: profile.mode,
    dayStart: profile.dayStart,
    dayEnd: profile.dayEnd,
    periods: profile.periods.map(p => ({ ...p })),
    display: { ...profile.display },
  }));
  const [copyFrom, setCopyFrom] = useState('');
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<StructureDraft>) => setD(x => ({ ...x, ...patch }));
  const setPeriod = (id: string, patch: Partial<TimetablePeriod>) => set({ periods: d.periods.map(p => (p.id === id ? { ...p, ...patch } : p)) });
  const movePeriod = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.periods.length) return;
    const periods = [...d.periods];
    [periods[i], periods[j]] = [periods[j], periods[i]];
    set({ periods });
  };
  const toggleDay = (day: DayId) => set({ days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] });

  const periodErrors = d.periods.map(p => validatePeriod(p));
  const hoursError = !isTime(d.dayStart) || !isTime(d.dayEnd) || toMin(d.dayEnd) <= toMin(d.dayStart) ? 'يجب أن ينتهي اليوم بعد بدايته' : null;
  const errors = {
    name: d.name.trim() ? null : 'اكتب اسم الجدول',
    days: d.days.length ? null : 'اختر يومًا واحدًا على الأقل',
    hours: hoursError,
    periods: periodErrors.some(e => Object.keys(e).length) ? 'راجع أوقات الفترات' : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const hiddenAfter = profile.entries.filter(e => !d.days.includes(e.day)).length;
  const ordered = orderedDays({ days: d.days.length ? d.days : profile.days, firstDay: d.firstDay });

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    await run(s => applyStructure(s, profile.id, d, Date.now()));
    toast('تم حفظ إعدادات الجدول', 'success');
    onClose();
  };

  const doCopy = async () => {
    const src = others.find(o => o.id === copyFrom);
    if (!src) return;
    const ok = await confirmAction(`سيُنسخ هيكل «${src.name}» (الأيام، طريقة الوقت، الفترات، الساعات، المجموعات، طريقة العرض) إلى هذا الجدول. حصصك تبقى كما هي.`, {
      title: 'نسخ هيكل جدول',
      confirmLabel: 'نسخ الهيكل',
    });
    if (!ok) return;
    await run(s => copyStructure(s, src.id, profile.id, newId, Date.now()));
    toast('تم نسخ الهيكل', 'success');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="إعدادات الجدول" className="shadow-none! sm:w-[min(640px,100%)]">
      <form
        noValidate
        className="space-y-7"
        onSubmit={e => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم الجدول" error={touched ? errors.name : null}>
            {props => <TextInput {...props} value={d.name} maxLength={80} onChange={e => set({ name: e.target.value })} />}
          </Field>
          <Field label="وصف (اختياري)">{props => <TextInput {...props} value={d.description ?? ''} maxLength={300} onChange={e => set({ description: e.target.value })} />}</Field>
        </div>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">أيام الأسبوع</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAY_IDS.map(day => (
              <button key={day} type="button" aria-pressed={d.days.includes(day)} onClick={() => toggleDay(day)} className={chip(d.days.includes(day))}>
                {DAY_LABEL[day]}
              </button>
            ))}
          </div>
          {touched && errors.days && <p className="m-0 mt-1.5 text-xs text-[#a23b24]">{errors.days}</p>}
          {hiddenAfter > 0 && <p className="m-0 mt-2 text-xs text-[#7c4e0e]">{hiddenAfter} من حصصك في أيام غير مختارة ستُخفى — ولن تُحذف، وتعود إن أعدت اليوم.</p>}
          <div className="mt-3 max-w-xs">
            <Field label="أول يوم في الأسبوع">
              {props => (
                <Select {...props} value={d.firstDay} onChange={e => set({ firstDay: e.target.value as DayId })}>
                  {DAY_IDS.filter(x => d.days.includes(x)).map(x => (
                    <option key={x} value={x}>
                      {DAY_LABEL[x]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <p className="m-0 mt-1.5 text-xs text-subtle">الترتيب: {ordered.map(x => DAY_LABEL[x]).join(' ← ')}</p>
          </div>
        </fieldset>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">الوقت</legend>
          <Segmented
            label="طريقة تحديد الوقت"
            value={d.mode}
            onChange={mode => set({ mode })}
            options={[
              ['free', 'أوقات حرة'],
              ['periods', 'فترات محددة'],
            ]}
          />
          <p className="m-0 mt-2 text-[13px] text-subtle">
            {d.mode === 'free' ? 'كل حصة بوقت بدايتها ونهايتها كما هو، بلا قيود.' : 'عرّف فترات يومك كما في جامعتك، ثم اختر الفترة عند إضافة حصة. الفراغ بين الفترات يظهر استراحةً.'}
          </p>

          {d.mode === 'periods' && (
            <div className="mt-4 space-y-2">
              {d.periods.length === 0 && <p className="m-0 text-[13px] text-muted">لا فترات بعد — أضف أول فترة.</p>}
              {d.periods.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_8.75rem_8.75rem_auto] items-start gap-2 max-sm:grid-cols-2">
                  <TextInput aria-label={`اسم الفترة ${i + 1}`} value={p.name} maxLength={60} onChange={e => setPeriod(p.id, { name: e.target.value })} aria-invalid={touched && !!periodErrors[i].name ? true : undefined} className="max-sm:col-span-2" />
                  <TextInput aria-label={`بداية ${p.name}`} type="time" dir="ltr" step={300} value={p.start} onChange={e => setPeriod(p.id, { start: e.target.value })} aria-invalid={touched && !!periodErrors[i].start ? true : undefined} />
                  <TextInput aria-label={`نهاية ${p.name}`} type="time" dir="ltr" step={300} value={p.end} onChange={e => setPeriod(p.id, { end: e.target.value })} aria-invalid={touched && !!periodErrors[i].end ? true : undefined} />
                  <span className="flex gap-0.5 max-sm:col-span-2">
                    <Button size="icon" variant="ghost" aria-label={`نقل ${p.name} للأعلى`} disabled={i === 0} onClick={() => movePeriod(i, -1)}>
                      <Icon name="chevronDown" size={15} className="rotate-180" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`نقل ${p.name} للأسفل`} disabled={i === d.periods.length - 1} onClick={() => movePeriod(i, 1)}>
                      <Icon name="chevronDown" size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`حذف ${p.name}`} onClick={() => set({ periods: d.periods.filter(x => x.id !== p.id) })}>
                      <Icon name="trash" size={15} />
                    </Button>
                  </span>
                </div>
              ))}
              {touched && errors.periods && <p className="m-0 text-xs text-[#a23b24]">{errors.periods}</p>}
              <Button
                size="sm"
                onClick={() => {
                  const sug = suggestPeriod({ ...profile, periods: d.periods, dayStart: d.dayStart });
                  set({ periods: [...d.periods, { id: newId(), ...sug }] });
                }}
              >
                <Icon name="plus" size={14} /> إضافة فترة
              </Button>
              <p className="m-0 text-xs text-subtle">حذف فترة لا يحذف حصصها — تبقى بأوقاتها. وتعديل وقت فترة ينقل حصصها معها.</p>
            </div>
          )}

          <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
            <Field label="بداية اليوم في العرض" error={touched ? hoursError : null}>
              {props => <TextInput {...props} type="time" dir="ltr" step={900} value={d.dayStart} onChange={e => set({ dayStart: e.target.value })} />}
            </Field>
            <Field label="نهاية اليوم">{props => <TextInput {...props} type="time" dir="ltr" step={900} value={d.dayEnd} onChange={e => set({ dayEnd: e.target.value })} />}</Field>
          </div>
        </fieldset>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">طريقة العرض</legend>
          <Segmented
            label="كثافة العرض"
            value={d.display.density}
            onChange={density => set({ display: { ...d.display, density } })}
            options={[
              ['detailed', 'مفصّل'],
              ['compact', 'مختصر'],
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {(
              [
                ['showRoom', 'إظهار المكان'],
                ['showInstructor', 'إظهار المحاضر'],
                ['showGroup', 'إظهار المجموعة'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={d.display[key]} onChange={e => set({ display: { ...d.display, [key]: e.target.checked } })} className="size-4 accent-brand" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {others.length > 0 && (
          <fieldset className="mx-0 min-w-0 border-t border-line p-0 pt-5">
            <legend className="sr-only">نسخ هيكل</legend>
            <p className="m-0 mb-2 text-[15px] font-semibold text-ink">نسخ هيكل من جدول آخر</p>
            <div className="flex flex-wrap items-end gap-2">
              <label htmlFor="copy-from" className="sr-only">
                الجدول المصدر
              </label>
              <Select id="copy-from" value={copyFrom} onChange={e => setCopyFrom(e.target.value)} className="w-auto! min-w-48">
                <option value="">اختر جدولًا…</option>
                {others.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <Button disabled={!copyFrom} onClick={() => void doCopy()}>
                نسخ الهيكل
              </Button>
            </div>
          </fieldset>
        )}

        <DialogActions>
          <Button type="submit" variant="primary">
            حفظ الإعدادات
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
