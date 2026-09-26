import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useMatches, useNavigation } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useTimerEngine } from '@/features/timer/useTimerEngine';
import { CommandPalette } from '@/features/search/CommandPalette';
import { useDocumentLocale } from '@/i18n/locale';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { ROUTES } from '@/routes/paths';
import type { RouteHandle } from '@/routes/router';
import { cn } from '@/lib/cn';
import { Sidebar } from './shell/Sidebar';
import { AccountMenu } from './shell/AccountMenu';
import { SyncIndicator } from './shell/SyncIndicator';
import { TimerChip } from './shell/TimerChip';
import { MobileNav } from './shell/MobileNav';

function usePageTitle(): string {
  const matches = useMatches();
  const handle = [...matches].reverse().find(m => (m.handle as RouteHandle | undefined)?.title)?.handle as RouteHandle | undefined;
  return handle?.title ?? 'Study Planner';
}

/** Thin indeterminate bar while a lazily loaded page is on its way (instead of a spinner). */
function RouteProgress() {
  const busy = useNavigation().state !== 'idle';
  if (!busy) return null;
  return (
    <div role="progressbar" aria-label="جارٍ تحميل الصفحة" className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-brand/10">
      <div className="h-full w-1/3 bg-brand motion-safe:animate-[route-progress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

/** Opens the command palette on Ctrl/⌘+K, or "/" when not typing in a field. */
function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        open();
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
}

/**
 * Authenticated shell. Desktop: light sidebar + quiet top bar (search · focus · sync ·
 * account). Phone/tablet: compact top bar + bottom navigation with a centred focus button.
 */
export function AppShell() {
  // The dashboard is Arabic-only, whatever language the public pages were viewed in.
  useDocumentLocale('ar');
  useTimerEngine();
  const title = usePageTitle();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => readLocal(STORAGE_KEYS.sidebarCollapsed) === '1');
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const mainRef = useRef<HTMLElement>(null);
  useSearchShortcut(openSearch);

  useEffect(() => {
    document.title = `${title} · Study Planner`;
  }, [title]);

  // New page: scroll to top and move focus to the content for screen readers.
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
      <RouteProgress />

      <aside className={cn('fixed inset-y-0 start-0 z-30 hidden border-e border-brand-night/[0.07] bg-sidebar transition-[width] duration-300 ease-out lg:block', collapsed ? 'w-[72px]' : 'w-60')}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-300 ease-out', collapsed ? 'lg:ps-[72px]' : 'lg:ps-60')}>
        <header className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-4 sm:px-6 lg:px-10">
            <NavLink to={ROUTES.app} end className="rounded-lg lg:hidden" aria-label="Study Planner — الرئيسية">
              <BrandLogo size={30} />
            </NavLink>
            <p className="m-0 min-w-0 truncate text-[15px] font-semibold text-ink lg:hidden" aria-hidden="true">
              {title}
            </p>

            {/* Search: a field-like button on desktop, an icon on phones. */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="بحث (Ctrl+K)"
              className="hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-full border border-line bg-white/70 ps-3.5 pe-2 text-[13px] text-muted transition-colors hover:border-[#cfd9d2] hover:bg-white lg:flex"
            >
              <Icon name="search" size={16} />
              <span className="flex-1 text-start">ابحث في موادك ومحاضراتك…</span>
              <kbd dir="ltr" className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans text-[11px] text-subtle">
                Ctrl K
              </kbd>
            </button>

            <div className="ms-auto flex items-center gap-1">
              <button type="button" onClick={openSearch} aria-label="بحث" className="grid size-9 place-items-center rounded-full text-subtle hover:bg-ink/5 hover:text-ink lg:hidden">
                <Icon name="search" size={19} />
              </button>
              <span className="max-sm:hidden">
                <TimerChip />
              </span>
              <span className="sm:hidden">
                <TimerChip compact />
              </span>
              <span className="max-lg:hidden">
                <SyncIndicator compact />
              </span>
              <AccountMenu />
            </div>
          </div>
        </header>

        <main id="app-main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-4 outline-none sm:px-6 sm:pt-6 lg:px-10 lg:pb-16">
          <div key={location.pathname} className="motion-safe:animate-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
