import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useMatches } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useTimerEngine } from '@/features/timer/useTimerEngine';
import { useDocumentLocale } from '@/i18n/locale';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { ROUTES } from '@/routes/paths';
import type { RouteHandle } from '@/routes/router';
import { cn } from '@/lib/cn';
import { Sidebar } from './shell/Sidebar';
import { AccountMenu } from './shell/AccountMenu';
import { SyncIndicator } from './shell/SyncIndicator';
import { TimerChip } from './shell/TimerChip';

const MOBILE_TABS = [
  { to: ROUTES.app, label: 'الرئيسية', icon: 'home', end: true },
  { to: ROUTES.courses, label: 'المواد', icon: 'book' },
  { to: ROUTES.timer, label: 'المؤقت', icon: 'timer' },
  { to: ROUTES.commitments, label: 'الالتزامات', icon: 'clipboard' },
] as const;

function usePageTitle(): string {
  const matches = useMatches();
  const handle = [...matches].reverse().find(m => (m.handle as RouteHandle | undefined)?.title)?.handle as RouteHandle | undefined;
  return handle?.title ?? 'Study Planner';
}

/** Mobile navigation drawer: modal, focus-trapped, Escape/backdrop to close, focus restored. */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-[#0f1f1a66]" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="قائمة التنقل" className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-white shadow-2xl motion-safe:animate-fade-up">
        <button type="button" onClick={onClose} aria-label="إغلاق القائمة" className="absolute end-2 top-3.5 z-10 grid size-9 place-items-center rounded-lg text-subtle hover:bg-ink/5">
          <Icon name="close" size={18} />
        </button>
        <Sidebar collapsed={false} onNavigate={onClose} inDrawer />
      </div>
    </div>
  );
}

/** Authenticated application shell: sidebar, top bar, content, mobile drawer + tab bar. */
export function AppShell() {
  // The dashboard is Arabic-only, whatever language the public pages were viewed in.
  useDocumentLocale('ar');
  useTimerEngine();
  const title = usePageTitle();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => readLocal(STORAGE_KEYS.sidebarCollapsed) === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${title} · Study Planner`;
  }, [title]);

  // New page: scroll to top and move focus to the content for screen readers.
  // (Drawer links close the drawer themselves via onNavigate.)
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const toggleCollapsed = () =>
    setCollapsed(c => {
      writeLocal(STORAGE_KEYS.sidebarCollapsed, c ? null : '1');
      return !c;
    });

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#app-main" className="sr-only z-[70] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        تخطَّ إلى المحتوى
      </a>

      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 start-0 z-30 hidden border-e border-line bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-60')}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:ps-[68px]' : 'lg:ps-60')}>
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="فتح القائمة" aria-expanded={drawerOpen} className="grid size-9 place-items-center rounded-lg text-ink hover:bg-ink/5 lg:hidden">
              <Icon name="menu" size={20} />
            </button>
            <NavLink to={ROUTES.app} end className="rounded-lg lg:hidden" aria-label="Study Planner — الرئيسية">
              <BrandLogo size={28} />
            </NavLink>
            <p className="m-0 min-w-0 truncate text-[15px] font-semibold text-ink max-sm:hidden" aria-hidden="true">
              {title}
            </p>
            <div className="ms-auto flex items-center gap-1.5">
              <TimerChip />
              <span className="max-md:hidden">
                <SyncIndicator />
              </span>
              <AccountMenu />
            </div>
          </div>
        </header>

        <main id="app-main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 outline-none sm:px-6 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="تنقل سريع" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="m-0 grid list-none grid-cols-5 p-0">
          {MOBILE_TABS.map(tab => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={'end' in tab ? tab.end : undefined}
                className={({ isActive }) => cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] no-underline', isActive ? 'font-semibold text-brand' : 'text-subtle')}
              >
                <Icon name={tab.icon} size={20} />
                {tab.label}
              </NavLink>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setDrawerOpen(true)} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-subtle">
              <Icon name="menu" size={20} />
              المزيد
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
