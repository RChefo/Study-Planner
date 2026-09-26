import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { TimerSettings } from '@/types';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { exportExcelBackup, importExcelBackup } from '@/features/backup/excelBackup';
import { signOut, signOutEverywhere } from '@/features/auth/authFlow';
import { clampSettings, settingError } from '@/features/timer/timerController';
import { dailyGoal } from '@/features/insights/selectors';
import { GROUPS, saveGroup, savedGroup } from '@/features/timetable/schedule';
import { clearDeviceData } from '@/services/localStore';
import { useAuthStore } from '@/stores/authStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { useI18n, useLocaleStore } from '@/i18n/locale';
import { ROUTES, loginPath } from '@/routes/paths';

const SECTIONS = [
  ['account', 'الحساب'],
  ['study', 'تفضيلات المذاكرة'],
  ['timer', 'المؤقت'],
  ['language', 'اللغة'],
  ['notifications', 'الإشعارات'],
  ['data', 'البيانات والنسخ الاحتياطي'],
  ['security', 'الأمان'],
] as const;

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="m-0 text-lg font-semibold text-ink">
        {title}
      </h2>
      {description && <p className="m-0 mt-1 text-[13px] text-subtle">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Label/description on the start side, the control on the end; stacks on phones. */
function Row({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0 flex-1 basis-64">
        <p className="m-0 text-[15px] font-medium text-ink">{title}</p>
        {description && <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-subtle">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function AccountSection() {
  const user = useAuthStore(s => s.user);
  const local = useAuthStore(s => s.status === 'local');
  const navigate = useNavigate();
  if (!user) {
    return (
      <Row title={local ? 'تستخدم هذا الجهاز فقط' : 'غير مسجّل الدخول'} description="سجّل الدخول بـ Google أو Discord لمزامنة خطتك بين أجهزتك.">
        <ButtonLink to={loginPath({ next: ROUTES.settings })} variant="primary">
          تسجيل الدخول
        </ButtonLink>
      </Row>
    );
  }
  return (
    <Row
      title={user.name}
      description={
        <>
          {user.email && (
            <span dir="ltr" className="block">
              {user.email}
            </span>
          )}
          مسجّل عبر {user.provider === 'discord' ? 'Discord' : 'Google'} · بياناتك تُزامَن مع حسابك
        </>
      }
    >
      <Button
        onClick={async () => {
          await signOut();
          navigate(ROUTES.login, { replace: true });
        }}
      >
        <Icon name="logout" size={15} /> تسجيل الخروج
      </Button>
    </Row>
  );
}

function StudySection() {
  const data = usePlannerStore(s => s.data);
  const setDailyGoal = usePlannerStore(s => s.setDailyGoal);
  const [goal, setGoal] = useState(String(dailyGoal(data)));
  const [group, setGroup] = useState(savedGroup);
  const value = Number(goal);
  const error = !Number.isInteger(value) || value < 10 || value > 1440 ? 'بين 10 و1440 دقيقة' : null;
  return (
    <>
      <Row title="الهدف اليومي" description="يظهر في الرئيسية كنسبة إنجاز يومية.">
        <form
          noValidate
          className="flex items-start gap-2"
          onSubmit={async e => {
            e.preventDefault();
            if (error) return;
            await setDailyGoal(value);
            toast('تم حفظ الهدف اليومي', 'success');
          }}
        >
          <Field label={<span className="sr-only">الهدف اليومي بالدقائق</span>} error={error}>
            {props => (
              <div className="relative">
                <TextInput {...props} type="number" inputMode="numeric" value={goal} onChange={e => setGoal(e.target.value)} className="w-28! pe-9" />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-subtle">د</span>
              </div>
            )}
          </Field>
          <Button type="submit" className="mt-[26px]" disabled={String(dailyGoal(data)) === goal}>
            حفظ
          </Button>
        </form>
      </Row>
      <Row title="مجموعتك في الجدول" description="تُستخدم لعرض محاضراتك الجامعية في يومك وفي الجدول.">
        <label htmlFor="settings-group" className="sr-only">
          مجموعتك
        </label>
        <Select
          id="settings-group"
          value={group}
          onChange={e => {
            setGroup(e.target.value);
            saveGroup(e.target.value);
            toast('تم حفظ المجموعة', 'success');
          }}
          className="w-auto! min-w-44 rounded-full ps-4"
        >
          <option value="">كل المجموعات</option>
          {GROUPS.map(n => (
            <option key={n} value={n}>
              المجموعة {n}
            </option>
          ))}
        </Select>
      </Row>
    </>
  );
}

function TimerSection() {
  const timer = useTimerStore(s => s.timer);
  const commit = usePlannerStore(s => s.commit);
  const [values, setValues] = useState({ focus: String(timer.focus), shortBreak: String(timer.shortBreak), longBreak: String(timer.longBreak), cycles: String(timer.cycles) });
  const [touched, setTouched] = useState(false);
  const errors = Object.fromEntries((Object.keys(values) as Array<keyof TimerSettings>).map(k => [k, settingError(k, values[k])])) as Record<keyof TimerSettings, string | null>;
  const invalid = Object.values(errors).some(Boolean);

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    const settings = clampSettings(values);
    const store = useTimerStore.getState();
    if (store.timer.active) toast('ستُطبّق المدد الجديدة على الجولة القادمة', 'info');
    else store.setTimer(settings);
    store.setDraft(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)])));
    // Timer lengths travel with the synced data; commit so they sync now.
    await commit(d => d);
    toast('تم حفظ إعدادات المؤقت', 'success');
  };

  const numberField = (key: keyof TimerSettings, label: string, unit?: string) => (
    <Field label={label} error={touched ? errors[key] : null}>
      {props => (
        <div className="relative">
          <TextInput {...props} type="number" inputMode="numeric" value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} className={unit ? 'pe-9' : undefined} />
          {unit && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-subtle">{unit}</span>}
        </div>
      )}
    </Field>
  );

  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {numberField('focus', 'تركيز', 'د')}
        {numberField('shortBreak', 'استراحة قصيرة', 'د')}
        {numberField('longBreak', 'استراحة طويلة', 'د')}
        {numberField('cycles', 'جولات قبل الطويلة')}
      </div>
      <Button type="submit" variant="primary" className="mt-5">
        حفظ المدد
      </Button>
    </form>
  );
}

function LanguageSection() {
  const { locale } = useI18n();
  const setLocale = useLocaleStore(s => s.setLocale);
  return (
    <Row title="لغة الواجهة" description="التطبيق بالعربية. الصفحة التعريفية وصفحة تسجيل الدخول متاحتان بالعربية والإنجليزية.">
      <label htmlFor="public-locale" className="sr-only">
        لغة الصفحات العامة
      </label>
      <Select id="public-locale" value={locale} onChange={e => setLocale(e.target.value === 'en' ? 'en' : 'ar')} className="w-auto! min-w-44 rounded-full ps-4">
        <option value="ar">الصفحات العامة: العربية</option>
        <option value="en">الصفحات العامة: English</option>
      </Select>
    </Row>
  );
}

function NotificationSection() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  const state = !supported ? 'هذا المتصفح لا يدعم الإشعارات.' : permission === 'granted' ? 'مفعّلة: ستصلك تنبيهات عند انتهاء الجولة والاستراحة.' : permission === 'denied' ? 'محظورة من المتصفح؛ فعّلها من إعدادات الموقع.' : 'غير مفعّلة.';
  return (
    <Row title="تنبيهات سطح المكتب" description={state}>
      {supported && permission === 'default' && (
        <Button
          onClick={async () => {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') toast('تم تفعيل الإشعارات', 'success');
          }}
        >
          <Icon name="bell" size={15} /> تفعيل
        </Button>
      )}
    </Row>
  );
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(s => s.user);
  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);
  return (
    <>
      <Row title="نسخة Excel احتياطية" description="ملف واحد يحوي موادك ومحاضراتك والتزاماتك وسجلك وملفات PDF.">
        <Button
          loading={busy === 'export'}
          onClick={async () => {
            setBusy('export');
            await exportExcelBackup().finally(() => setBusy(null));
          }}
        >
          <Icon name="download" size={15} /> تنزيل
        </Button>
        <Button loading={busy === 'import'} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={15} /> استعادة
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
      </Row>
      <Row title="مسح بيانات هذا الجهاز" description={user ? 'يحذف نسخة هذا الجهاز ويسجّل خروجك؛ تبقى بياناتك في حسابك.' : 'يحذف كل بياناتك من هذا الجهاز نهائيًا. نزّل نسخة Excel أولًا إن احتجت إليها.'}>
        <Button
          variant="danger"
          loading={busy === 'clear'}
          onClick={async () => {
            const ok = await confirmAction(user ? 'سيتم حذف بيانات هذا الجهاز وتسجيل خروجك.' : 'سيتم حذف كل موادك والتزاماتك وسجلك من هذا الجهاز نهائيًا، ولا يمكن التراجع.', {
              title: 'مسح بيانات هذا الجهاز',
              confirmLabel: 'مسح البيانات',
              danger: true,
            });
            if (!ok) return;
            setBusy('clear');
            if (user) await signOut();
            await clearDeviceData();
            // Full reload so every in-memory copy is dropped too.
            window.location.assign(ROUTES.home);
          }}
        >
          <Icon name="trash" size={15} /> مسح
        </Button>
      </Row>
    </>
  );
}

function SecuritySection() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  return (
    <Row title="الخروج من كل الأجهزة" description={user ? 'ينهي كل جلساتك المفتوحة على الأجهزة الأخرى فورًا.' : 'متاح بعد تسجيل الدخول.'}>
      <Button
        variant="danger"
        disabled={!user}
        onClick={async () => {
          const ok = await confirmAction('سيتم تسجيل خروجك من هذا الجهاز وكل الأجهزة الأخرى.', { title: 'الخروج من كل الأجهزة', confirmLabel: 'الخروج من الكل', danger: true });
          if (!ok) return;
          await signOutEverywhere();
          navigate(ROUTES.login, { replace: true });
        }}
      >
        <Icon name="shield" size={15} /> الخروج من الكل
      </Button>
    </Row>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="الإعدادات" />
      <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="أقسام الإعدادات" className="max-lg:hidden">
          <ul className="sticky top-24 m-0 list-none space-y-0.5 p-0">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-sm text-subtle no-underline transition-colors hover:bg-white hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-w-3xl space-y-10">
          <Section id="account" title="الحساب">
            <AccountSection />
          </Section>
          <Section id="study" title="تفضيلات المذاكرة">
            <StudySection />
          </Section>
          <Section id="timer" title="المؤقت" description="المدد الافتراضية لجولات التركيز والاستراحات.">
            <TimerSection />
          </Section>
          <Section id="language" title="اللغة">
            <LanguageSection />
          </Section>
          <Section id="notifications" title="الإشعارات">
            <NotificationSection />
          </Section>
          <Section id="data" title="البيانات والنسخ الاحتياطي">
            <DataSection />
          </Section>
          <Section id="security" title="الأمان">
            <SecuritySection />
          </Section>
        </div>
      </div>
    </div>
  );
}
