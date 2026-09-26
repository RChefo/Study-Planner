import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { TimerSettings } from '@/types';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { exportExcelBackup, importExcelBackup } from '@/features/backup/excelBackup';
import { signOut, signOutEverywhere } from '@/features/auth/authFlow';
import { clampSettings, settingError } from '@/features/timer/timerController';
import { dailyGoal } from '@/features/insights/selectors';
import { GROUPS } from '@/features/timetable/schedule';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { clearDeviceData } from '@/services/localStore';
import { useAuthStore } from '@/stores/authStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { ROUTES, loginPath } from '@/routes/paths';

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card aria-labelledby={id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-8">
      <div>
        <h2 id={id} className="m-0 text-[15px] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="m-0 mt-1 text-[13px] leading-relaxed text-subtle">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

function StudySettings() {
  const data = usePlannerStore(s => s.data);
  const setDailyGoal = usePlannerStore(s => s.setDailyGoal);
  const commit = usePlannerStore(s => s.commit);
  const timer = useTimerStore(s => s.timer);
  const [goal, setGoal] = useState(String(dailyGoal(data)));
  const [values, setValues] = useState({ focus: String(timer.focus), shortBreak: String(timer.shortBreak), longBreak: String(timer.longBreak), cycles: String(timer.cycles) });
  const [touched, setTouched] = useState(false);

  const goalValue = Number(goal);
  const goalError = !Number.isInteger(goalValue) || goalValue < 10 || goalValue > 1440 ? 'بين 10 و1440 دقيقة' : null;
  const errors = Object.fromEntries((Object.keys(values) as Array<keyof TimerSettings>).map(k => [k, settingError(k, values[k])])) as Record<keyof TimerSettings, string | null>;
  const invalid = !!goalError || Object.values(errors).some(Boolean);

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    const settings = clampSettings(values);
    const store = useTimerStore.getState();
    if (store.timer.active) toast('ستُطبّق مدد المؤقت الجديدة على الجولة القادمة', 'info');
    else store.setTimer(settings);
    store.setDraft(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)])));
    await setDailyGoal(goalValue);
    // Timer lengths travel with the synced data; commit once more so they sync now.
    await commit(d => d);
    toast('تم حفظ الإعدادات', 'success');
  };

  const numberField = (key: keyof TimerSettings, label: string) => (
    <Field label={label} error={touched ? errors[key] : null}>
      {props => <TextInput {...props} type="number" inputMode="numeric" value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />}
    </Field>
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="الهدف اليومي (دقائق)" error={touched ? goalError : null} hint="يظهر في الرئيسية كنسبة إنجاز يومية.">
        {props => <TextInput {...props} type="number" inputMode="numeric" value={goal} onChange={e => setGoal(e.target.value)} className="max-w-40" />}
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numberField('focus', 'تركيز (د)')}
        {numberField('shortBreak', 'استراحة قصيرة (د)')}
        {numberField('longBreak', 'استراحة طويلة (د)')}
        {numberField('cycles', 'جولات قبل الطويلة')}
      </div>
      <Button type="submit" variant="primary">
        حفظ
      </Button>
    </form>
  );
}

function TimetableSettings() {
  const [group, setGroup] = useState(() => {
    const saved = readLocal(STORAGE_KEYS.timetableGroup) ?? '';
    return /^[1-8]$/.test(saved) ? saved : '';
  });
  return (
    <Field label="مجموعتك" hint="تُستخدم لعرض محاضراتك في الرئيسية وفي جدول المحاضرات.">
      {props => (
        <Select
          {...props}
          value={group}
          onChange={e => {
            setGroup(e.target.value);
            writeLocal(STORAGE_KEYS.timetableGroup, e.target.value || null);
            toast('تم حفظ المجموعة', 'success');
          }}
          className="max-w-56"
        >
          <option value="">كل المجموعات</option>
          {GROUPS.map(n => (
            <option key={n} value={n}>
              المجموعة {n}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

function NotificationSettings() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  if (!supported) return <p className="m-0 text-sm text-subtle">هذا المتصفح لا يدعم الإشعارات.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="m-0 flex-1 text-sm text-ink">
        {permission === 'granted' ? 'مفعّلة: ستصلك تنبيهات عند انتهاء جولة التركيز والاستراحة.' : permission === 'denied' ? 'محظورة من المتصفح. فعّلها من إعدادات الموقع في المتصفح.' : 'غير مفعّلة.'}
      </p>
      {permission === 'default' && (
        <Button
          onClick={async () => {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') toast('تم تفعيل الإشعارات', 'success');
          }}
        >
          <Icon name="bell" size={15} /> تفعيل الإشعارات
        </Button>
      )}
    </div>
  );
}

function BackupSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        loading={busy === 'export'}
        onClick={async () => {
          setBusy('export');
          await exportExcelBackup().finally(() => setBusy(null));
        }}
      >
        <Icon name="download" size={15} /> تنزيل نسخة Excel
      </Button>
      <Button loading={busy === 'import'} onClick={() => fileRef.current?.click()}>
        <Icon name="upload" size={15} /> استعادة من Excel
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={async e => {
          const input = e.target;
          const file = input.files?.[0];
          if (!file) return;
          const ok = await confirmAction('ستحل البيانات الموجودة في الملف محل كل موادك والتزاماتك وسجلك الحالي. ننصح بتنزيل نسخة احتياطية أولًا.', {
            title: 'استعادة نسخة احتياطية',
            confirmLabel: 'استعادة',
            danger: true,
          });
          if (ok) {
            setBusy('import');
            await importExcelBackup(file).finally(() => setBusy(null));
          }
          input.value = '';
        }}
      />
    </div>
  );
}

function AccountSettings() {
  const user = useAuthStore(s => s.user);
  const local = useAuthStore(s => s.status === 'local');
  const navigate = useNavigate();
  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 flex-1 text-sm text-ink">{local ? 'تستخدم البيانات على هذا الجهاز فقط.' : 'غير مسجل الدخول.'} سجّل الدخول لمزامنة خطتك بين أجهزتك.</p>
        <ButtonLink to={loginPath({ next: ROUTES.settings })} variant="primary">
          تسجيل الدخول
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-sm">
        <p className="m-0 font-semibold text-ink">{user.name}</p>
        {user.email && (
          <p className="m-0 text-subtle" dir="ltr">
            {user.email}
          </p>
        )}
        <p className="m-0 mt-0.5 text-xs text-subtle">مسجّل عبر {user.provider === 'discord' ? 'Discord' : 'Google'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            await signOut();
            navigate(ROUTES.login, { replace: true });
          }}
        >
          <Icon name="logout" size={15} /> تسجيل الخروج
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            const ok = await confirmAction('سيتم تسجيل خروجك من هذا الجهاز وكل الأجهزة الأخرى.', { title: 'الخروج من كل الأجهزة', confirmLabel: 'الخروج من الكل', danger: true });
            if (!ok) return;
            await signOutEverywhere();
            navigate(ROUTES.login, { replace: true });
          }}
        >
          <Icon name="shield" size={15} /> الخروج من كل الأجهزة
        </Button>
      </div>
    </div>
  );
}

function DeviceSettings() {
  const user = useAuthStore(s => s.user);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="m-0 flex-1 text-sm text-ink">
        {user ? 'يحذف نسخة هذا الجهاز ويسجّل خروجك. تبقى بياناتك محفوظة في حسابك.' : 'يحذف كل بياناتك من هذا الجهاز نهائيًا. نزّل نسخة Excel أولًا إن احتجت إليها.'}
      </p>
      <Button
        variant="danger"
        loading={busy}
        onClick={async () => {
          const ok = await confirmAction(user ? 'سيتم حذف بيانات هذا الجهاز وتسجيل خروجك.' : 'سيتم حذف كل موادك والتزاماتك وسجلك من هذا الجهاز نهائيًا، ولا يمكن التراجع.', {
            title: 'مسح بيانات هذا الجهاز',
            confirmLabel: 'مسح البيانات',
            danger: true,
          });
          if (!ok) return;
          setBusy(true);
          if (user) await signOut();
          await clearDeviceData();
          // Full reload so every in-memory copy is dropped too.
          window.location.assign(ROUTES.home);
        }}
      >
        <Icon name="trash" size={15} /> مسح بيانات هذا الجهاز
      </Button>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات" />
      <Section id="s-study" title="المذاكرة" description="هدفك اليومي ومدد المؤقت الافتراضية.">
        <StudySettings />
      </Section>
      <Section id="s-timetable" title="الجدول الجامعي">
        <TimetableSettings />
      </Section>
      <Section id="s-notify" title="الإشعارات" description="تنبيه على سطح المكتب عند انتهاء الجولات.">
        <NotificationSettings />
      </Section>
      <Section id="s-backup" title="النسخ الاحتياطي" description="ملف Excel كامل بما فيه ملفات PDF.">
        <BackupSettings />
      </Section>
      <Section id="s-account" title="الحساب">
        <AccountSettings />
      </Section>
      <Section id="s-device" title="هذا الجهاز" description="مفيد على الأجهزة المشتركة.">
        <DeviceSettings />
      </Section>
    </div>
  );
}
