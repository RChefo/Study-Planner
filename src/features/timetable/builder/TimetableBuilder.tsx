import { useMemo, useState } from 'react';
import type { DayId, TimetableEntry, TimetableProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { useMinuteNow } from '@/features/insights/hooks';
import { savedGroup } from '@/features/timetable/schedule';
import { arabicCount } from '@/lib/format';
import { confirmAction, toast } from '@/stores/uiStore';
import { DAY_LABEL, dayOf, deleteProfile, duplicateProfile, findConflicts, hiddenEntries, orderedDays, setActive, setArchived } from '../builder';
import { DayAgenda } from './DayAgenda';
import { EntryDialog, type EntryDialogState } from './EntryDialog';
import { CopyDayDialog, CreateDialog, ImportDialog, RenameDialog } from './ProfileDialogs';
import { SettingsDialog } from './SettingsDialog';
import { entryTitle, newId, useTimetable } from './useTimetable';
import { WeekGrid } from './WeekGrid';

type Modal = { kind: 'create' } | { kind: 'import' } | { kind: 'rename'; profile: TimetableProfile } | { kind: 'settings' } | { kind: 'copyDay'; day: DayId } | null;

/** The in-app timetable: the student's own profiles, built and edited here. */
export function TimetableBuilder() {
  const { timetables, profile, courses, run } = useTimetable();
  const weekday = dayOf(useMinuteNow());
  const [modal, setModal] = useState<Modal>(null);
  const [entry, setEntry] = useState<EntryDialogState | null>(null);
  const conflicts = useMemo(() => (profile ? findConflicts(profile) : []), [profile]);
  const conflictIds = useMemo(() => new Set(conflicts.flatMap(c => [c.a.id, c.b.id])), [conflicts]);
  const close = () => setModal(null);

  const live = timetables.filter(p => !p.archived);
  const archived = timetables.filter(p => p.archived);

  const remove = async (p: TimetableProfile) => {
    const ok = await confirmAction(`سيُحذف «${p.name}» بكل حصصه (${p.entries.length}). لا يمكن التراجع.`, { title: 'حذف الجدول', confirmLabel: 'حذف', danger: true });
    if (!ok) return;
    await run(s => deleteProfile(s, p.id));
    toast('تم حذف الجدول');
  };

  const profileItems: MenuItem[] = profile
    ? [
        ...live.filter(p => p.id !== profile.id).map(p => ({ label: `التبديل إلى «${p.name}»`, icon: 'calendar' as const, onSelect: () => void run(s => setActive(s, p.id)) })),
        { label: 'جدول جديد', icon: 'plus', onSelect: () => setModal({ kind: 'create' }) },
        { label: 'استيراد جدول الجامعة', icon: 'download', onSelect: () => setModal({ kind: 'import' }) },
        { label: 'إعادة التسمية', icon: 'edit', onSelect: () => setModal({ kind: 'rename', profile }) },
        {
          label: 'تكرار الجدول',
          icon: 'clipboard',
          onSelect: async () => {
            await run(s => duplicateProfile(s, profile.id, { profile: newId(), next: newId }, Date.now()));
            toast('تم تكرار الجدول', 'success');
          },
        },
        {
          label: 'أرشفة',
          icon: 'folder',
          onSelect: async () => {
            await run(s => setArchived(s, profile.id, true, Date.now()));
            toast('تمت الأرشفة — تجده في القائمة نفسها');
          },
        },
        ...archived.map(p => ({ label: `استعادة «${p.name}» من الأرشيف`, icon: 'history' as const, onSelect: () => void run(s => setArchived(s, p.id, false, Date.now())) })),
        { label: 'حذف الجدول', icon: 'trash', danger: true, onSelect: () => void remove(profile) },
      ]
    : [];

  const modals = (
    <>
      {modal?.kind === 'create' && <CreateDialog run={run} onClose={close} first={!timetables.length} />}
      {modal?.kind === 'import' && <ImportDialog run={run} onClose={close} defaultGroup={savedGroup()} />}
      {modal?.kind === 'rename' && <RenameDialog profile={modal.profile} run={run} onClose={close} />}
      {modal?.kind === 'settings' && profile && <SettingsDialog profile={profile} others={timetables.filter(p => p.id !== profile.id)} run={run} onClose={close} />}
      {modal?.kind === 'copyDay' && profile && <CopyDayDialog profile={profile} day={modal.day} run={run} onClose={close} />}
      {entry && profile && <EntryDialog key={entry.mode === 'edit' ? entry.entry.id : 'new'} state={entry} profile={profile} courses={courses} run={run} onClose={() => setEntry(null)} />}
    </>
  );

  if (!profile) {
    return (
      <div>
        <PageHeader title="الجدول" />
        <section className="mx-auto max-w-lg rounded-3xl border border-dashed border-[#d5ddd6] px-6 py-12 text-center sm:py-16">
          <span aria-hidden="true" className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-night">
            <Icon name="calendar" size={26} />
          </span>
          <h2 className="font-display m-0 text-2xl font-normal text-brand-night">لسه ما أضفتش جدولك</h2>
          <p className="m-0 mt-2 text-[15px] text-subtle">أنشئ جدولك بالطريقة اللي تناسب جامعتك.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => setModal({ kind: 'create' })}>
              <Icon name="plus" size={16} /> إنشاء جدول
            </Button>
            <Button onClick={() => setModal({ kind: 'import' })}>
              <Icon name="download" size={16} /> استيراد جدول
            </Button>
          </div>
          {archived.length > 0 && (
            <div className="mt-8 border-t border-line pt-5 text-start">
              <p className="m-0 mb-2 text-[13px] font-semibold text-subtle">جداول مؤرشفة</p>
              <ul className="m-0 list-none space-y-1.5 p-0">
                {archived.map(p => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => void run(s => setArchived(s, p.id, false, Date.now()))}>
                      استعادة
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {modals}
      </div>
    );
  }

  const hidden = hiddenEntries(profile);
  const onCopyDay = (day: DayId) => setModal({ kind: 'copyDay', day });
  const onOpen = (e: TimetableEntry) => setEntry({ mode: 'edit', entry: e });
  const today = profile.days.includes(weekday) ? weekday : orderedDays(profile)[0];
  const count = profile.entries.filter(e => e.kind === 'class').length;

  return (
    <div>
      <PageHeader
        title="الجدول"
        description={
          <>
            <span className="font-semibold text-ink">{profile.name}</span>
            {' · '}
            {count ? arabicCount(count, 'حصة واحدة', 'حصتان', 'حصص', 'حصة') : 'بلا حصص بعد'}
            {profile.description ? <span className="block text-[13px]">{profile.description}</span> : null}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Menu
              label={`الجدول الحالي: ${profile.name} — تبديل وإدارة`}
              items={profileItems}
              triggerClassName="size-auto! rounded-full! hover:bg-transparent!"
              trigger={
                <span className="inline-flex max-w-52 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm text-ink transition-colors hover:border-[#cfd9d2]">
                  <Icon name="calendar" size={15} className="shrink-0 text-brand" />
                  <span className="truncate">{profile.name}</span>
                  {live.length > 1 && <span className="rounded-full bg-brand-soft px-1.5 text-[11px] tabular-nums text-brand-night">{live.length}</span>}
                  <Icon name="chevronDown" size={14} className="shrink-0 text-muted" />
                </span>
              }
            />
            <Button onClick={() => setModal({ kind: 'settings' })}>
              <Icon name="settings" size={16} /> إعدادات الجدول
            </Button>
            <Button variant="primary" onClick={() => setEntry({ mode: 'add', day: today })}>
              <Icon name="plus" size={16} /> إضافة
            </Button>
          </div>
        }
      />

      {conflicts.length > 0 && (
        <div role="status" className="mb-6 rounded-2xl border border-[#ecd3b8] bg-[#fbf2e6] px-4 py-3 text-sm text-[#7c4e0e]">
          <p className="m-0 flex items-center gap-2 font-semibold">
            <Icon name="alert" size={16} /> يوجد تعارض في المواعيد
          </p>
          <ul className="m-0 mt-1.5 list-none space-y-1 p-0 text-[13px]">
            {conflicts.slice(0, 5).map(c => (
              <li key={`${c.a.id}-${c.b.id}`}>
                {DAY_LABEL[c.day]}:{' '}
                <button type="button" className="underline decoration-dotted underline-offset-4" onClick={() => onOpen(c.a)}>
                  {entryTitle(c.a, courses)}
                </button>{' '}
                <span dir="ltr">({c.a.start}–{c.a.end})</span> مع{' '}
                <button type="button" className="underline decoration-dotted underline-offset-4" onClick={() => onOpen(c.b)}>
                  {entryTitle(c.b, courses)}
                </button>{' '}
                <span dir="ltr">({c.b.start}–{c.b.end})</span>
              </li>
            ))}
            {conflicts.length > 5 && <li>و{conflicts.length - 5} غيرها.</li>}
          </ul>
        </div>
      )}

      {hidden > 0 && (
        <p className="m-0 mb-5 text-[13px] text-subtle">
          {arabicCount(hidden, 'حصة مخفية', 'حصتان مخفيتان', 'حصص مخفية', 'حصة مخفية')} في أيام أزلتها من الأسبوع — أعد اليوم من{' '}
          <button type="button" className="text-brand underline underline-offset-4" onClick={() => setModal({ kind: 'settings' })}>
            إعدادات الجدول
          </button>{' '}
          لتظهر.
        </p>
      )}

      <div className="max-lg:hidden">
        <WeekGrid profile={profile} courses={courses} conflictIds={conflictIds} onAdd={setEntry} onOpen={onOpen} onCopyDay={onCopyDay} />
      </div>
      <div className="lg:hidden">
        <DayAgenda profile={profile} courses={courses} conflictIds={conflictIds} onAdd={setEntry} onOpen={onOpen} onCopyDay={onCopyDay} />
      </div>
      {modals}
    </div>
  );
}
