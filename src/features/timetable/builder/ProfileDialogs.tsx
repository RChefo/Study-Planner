import { useState } from 'react';
import type { DayId, TimeMode, TimetableProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Field, TextInput } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { arabicCount } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/uiStore';
import { DAY_IDS, DAY_LABEL, WEEK_PRESETS, addProfile, duplicateDay, entriesOnDay, importUniversityTimetable, newProfile, orderedDays, renameProfile, type TimetableState } from '../builder';
import { newId } from './useTimetable';

type Run = (fn: (s: TimetableState) => TimetableState) => Promise<void>;

const chip = (on: boolean) =>
  cn('rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-brand-night bg-brand-night font-semibold text-dawn' : 'border-line bg-white text-subtle hover:text-ink');

/** New empty timetable: a name, the week, and how time is set. Everything else comes later. */
export function CreateDialog({ run, onClose, first }: { run: Run; onClose: () => void; first: boolean }) {
  const [name, setName] = useState(first ? 'جدولي' : '');
  const [days, setDays] = useState<DayId[]>(WEEK_PRESETS[0].days);
  const [firstDay, setFirstDay] = useState<DayId>(WEEK_PRESETS[0].firstDay);
  const [mode, setMode] = useState<TimeMode>('free');
  const [touched, setTouched] = useState(false);
  const preset = WEEK_PRESETS.find(p => p.days.length === days.length && p.days.every(d => days.includes(d)));
  const nameError = name.trim() ? null : 'اكتب اسم الجدول';
  const daysError = days.length ? null : 'اختر يومًا واحدًا على الأقل';

  const toggle = (d: DayId) => {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    setDays(next);
    if (!next.includes(firstDay) && next.length) setFirstDay(DAY_IDS.find(x => next.includes(x))!);
  };

  const save = async () => {
    setTouched(true);
    if (nameError || daysError) return;
    const p = newProfile({ id: newId(), name, now: Date.now(), days, firstDay, mode });
    await run(s => addProfile(s, p));
    toast(mode === 'periods' ? 'تم إنشاء الجدول — عرّف فتراتك من «إعدادات الجدول»' : 'تم إنشاء الجدول', 'success');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} className="shadow-none!" title={first ? 'إنشاء جدولك' : 'جدول جديد'} description="تقدر تغيّر أي شيء من هذا لاحقًا من «إعدادات الجدول».">
      <form
        noValidate
        className="space-y-6"
        onSubmit={e => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="اسم الجدول" error={touched ? nameError : null} hint="مثلًا: الترم الأول، جدول رمضان، الامتحانات">
          {props => <TextInput {...props} value={name} maxLength={80} autoFocus onChange={e => setName(e.target.value)} />}
        </Field>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">أيام الدراسة</legend>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {WEEK_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset?.id === p.id}
                onClick={() => {
                  setDays(p.days);
                  setFirstDay(p.firstDay);
                }}
                className={chip(preset?.id === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="أيام مخصصة">
            {DAY_IDS.map(d => (
              <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => toggle(d)} className={cn(chip(days.includes(d)), 'px-2.5 py-1 text-xs')}>
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
          {touched && daysError && <p className="m-0 mt-1.5 text-xs text-[#a23b24]">{daysError}</p>}
        </fieldset>

        <fieldset className="mx-0 min-w-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">كيف تحدد أوقات حصصك؟</legend>
          <Segmented
            label="طريقة تحديد الوقت"
            value={mode}
            onChange={setMode}
            options={[
              ['free', 'أوقات حرة'],
              ['periods', 'فترات محددة'],
            ]}
          />
          <p className="m-0 mt-2 text-[13px] text-subtle">
            {mode === 'free' ? 'اكتب وقت بداية ونهاية كل حصة كما هو.' : 'لجامعتك فترات ثابتة (الأولى، الثانية…)؟ عرّفها بأسمائها وأوقاتها، ثم اختر الفترة لكل حصة.'}
          </p>
        </fieldset>

        <DialogActions>
          <Button type="submit" variant="primary">
            إنشاء الجدول
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Turn the built-in university schedule into an editable timetable for one group. */
export function ImportDialog({ run, onClose, defaultGroup }: { run: Run; onClose: () => void; defaultGroup: string }) {
  const [group, setGroup] = useState(/^[1-8]$/.test(defaultGroup) ? Number(defaultGroup) : 0);
  const [touched, setTouched] = useState(false);

  const save = async () => {
    setTouched(true);
    if (!group) return;
    const p = importUniversityTimetable({ id: newId(), group, now: Date.now(), next: newId });
    await run(s => addProfile(s, p));
    toast('تم استيراد الجدول — عدّل فيه كما تشاء', 'success');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} className="shadow-none!" title="استيراد جدول الجامعة" description="جدول الفرقة الثالثة — تكنولوجيا الأمن السيبراني، الفصل الأول 2026/2027. يُنسخ كجدول مستقل تملكه وتعدّله بحرية.">
      <fieldset className="mx-0 min-w-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">مجموعتك</legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={cn(chip(group === g), 'min-w-11 tabular-nums')}>
              {g}
            </button>
          ))}
        </div>
        {touched && !group && <p className="m-0 mt-1.5 text-xs text-[#a23b24]">اختر مجموعتك</p>}
      </fieldset>
      <p className="m-0 mt-4 text-[13px] text-subtle">الحصص التي تتبادل أسبوعيًا تُنسخ مع ملاحظة بالأسبوع الذي تُعقد فيه.</p>
      <DialogActions>
        <Button variant="primary" onClick={() => void save()}>
          استيراد
        </Button>
        <Button onClick={onClose}>إلغاء</Button>
      </DialogActions>
    </Dialog>
  );
}

export function RenameDialog({ profile, run, onClose }: { profile: TimetableProfile; run: Run; onClose: () => void }) {
  const [name, setName] = useState(profile.name);
  const [touched, setTouched] = useState(false);
  const error = name.trim() ? null : 'اكتب اسم الجدول';
  return (
    <Dialog open onClose={onClose} className="shadow-none!" title="إعادة تسمية الجدول">
      <form
        noValidate
        onSubmit={async e => {
          e.preventDefault();
          setTouched(true);
          if (error) return;
          await run(s => renameProfile(s, profile.id, name, Date.now()));
          onClose();
        }}
      >
        <Field label="اسم الجدول" error={touched ? error : null}>
          {props => <TextInput {...props} value={name} maxLength={80} autoFocus onChange={e => setName(e.target.value)} />}
        </Field>
        <DialogActions>
          <Button type="submit" variant="primary">
            حفظ
          </Button>
          <Button onClick={onClose}>إلغاء</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Copy one day's classes to other days (existing classes there stay). */
export function CopyDayDialog({ profile, day, run, onClose }: { profile: TimetableProfile; day: DayId; run: Run; onClose: () => void }) {
  const [targets, setTargets] = useState<DayId[]>([]);
  const count = entriesOnDay(profile, day).length;
  const toggle = (d: DayId) => setTargets(t => (t.includes(d) ? t.filter(x => x !== d) : [...t, d]));
  const save = async () => {
    if (!targets.length) return;
    await run(s => duplicateDay(s, profile.id, day, targets, newId, Date.now()));
    toast(`تم نسخ ${DAY_LABEL[day]} إلى ${targets.map(d => DAY_LABEL[d]).join('، ')}`, 'success');
    onClose();
  };
  return (
    <Dialog open onClose={onClose} className="shadow-none!" title={`نسخ يوم ${DAY_LABEL[day]}`} description={`يُنسخ ${arabicCount(count, 'عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا')} إلى الأيام المختارة، وتبقى حصص تلك الأيام كما هي.`}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="نسخ إلى">
        {orderedDays(profile)
          .filter(d => d !== day)
          .map(d => (
            <button key={d} type="button" aria-pressed={targets.includes(d)} onClick={() => toggle(d)} className={chip(targets.includes(d))}>
              {DAY_LABEL[d]}
            </button>
          ))}
      </div>
      <DialogActions>
        <Button variant="primary" disabled={!targets.length} onClick={() => void save()}>
          نسخ
        </Button>
        <Button onClick={onClose}>إلغاء</Button>
      </DialogActions>
    </Dialog>
  );
}
