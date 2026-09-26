import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTimerStore } from '@/stores/timerStore';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { SyncIndicator } from './SyncIndicator';

const TABS: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: ROUTES.app, label: 'الرئيسية', icon: 'home', end: true },
  { to: ROUTES.courses, label: 'المواد', icon: 'book' },
  { to: ROUTES.commitments, label: 'الالتزامات', icon: 'clipboard' },
];

const MORE: Array<{ to: string; label: string; icon: IconName }> = [
  { to: ROUTES.timetable, label: 'الجدول', icon: 'calendar' },
  { to: ROUTES.studyLog, label: 'سجل المذاكرة', icon: 'history' },
  { to: ROUTES.stats, label: 'الإحصائيات', icon: 'chart' },
  { to: ROUTES.settings, label: 'الإعدادات', icon: 'settings' },
];

const tabClass = (active: boolean) =>
  cn('flex h-full flex-col items-center justify-center gap-1 text-[11px] no-underline transition-colors', active ? 'font-semibold text-brand-night' : 'text-subtle');

/**
 * Phone/tablet navigation: four destinations plus a centred focus button, and "المزيد" for
 * the rest in a bottom sheet — the desktop sidebar is never squeezed onto a phone.
 */
export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const timerActive = useTimerStore(s => s.timer.active);
  const inMore = MORE.some(m => location.pathname.startsWith(m.to));

  return (
    <>
      <nav aria-label="التنقل" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="m-0 grid h-16 list-none grid-cols-5 p-0">
          {TABS.slice(0, 2).map(tab => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={({ isActive }) => tabClass(isActive)}>
                <Icon name={tab.icon} size={20} />
                {tab.label}
              </NavLink>
            </li>
          ))}
          <li className="grid place-items-center">
            <NavLink
              to={ROUTES.timer}
              aria-label="وضع التركيز"
              className={({ isActive }) =>
                cn(
                  'relative grid size-12 place-items-center rounded-full no-underline shadow-[0_8px_20px_-8px_#0c2f26aa] transition-transform active:scale-95',
                  isActive ? 'bg-brand text-white' : 'bg-brand-night text-dawn',
                )
              }
            >
              <Icon name="timer" size={21} />
              {timerActive && <span aria-hidden="true" className="absolute end-0.5 top-0.5 size-2.5 rounded-full border-2 border-paper bg-[#8fd6b3]" />}
            </NavLink>
          </li>
          <li>
            <NavLink to={TABS[2].to} className={({ isActive }) => tabClass(isActive)}>
              <Icon name={TABS[2].icon} size={20} />
              {TABS[2].label}
            </NavLink>
          </li>
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className={cn(tabClass(inMore), 'w-full')}>
              <Icon name="menu" size={20} />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="المزيد" className="lg:hidden">
        <ul className="m-0 grid list-none gap-1 p-0">
          {MORE.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn('flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] no-underline transition-colors', isActive ? 'bg-brand-soft font-semibold text-brand-night' : 'text-ink hover:bg-stripe')
                }
              >
                <Icon name={item.icon} size={19} className="text-brand" />
                {item.label}
                <Icon name="chevronNext" size={16} className="ms-auto text-muted" />
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-3">
          <SyncIndicator />
        </div>
      </Dialog>
    </>
  );
}
