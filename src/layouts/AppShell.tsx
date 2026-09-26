import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigation } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useTimerEngine } from '@/features/timer/useTimerEngine';
import { CommandPalette } from '@/features/search/CommandPalette';
import { useDocumentLocale } from '@/i18n/locale';
import { ROUTES } from '@/routes/paths';
import type { RouteHandle } from '@/routes/router';
import { cn } from '@/lib/cn';
import { AccountMenu } from './shell/AccountMenu';
import { SyncIndicator } from './shell/SyncIndicator';
import { StudyPath } from './shell/StudyPath';
import { JourneyNav } from './shell/JourneyNav';
import { FocusControl } from './shell/FocusControl';
import { SETTINGS } from './shell/navModel';

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

/** True once the page has scrolled (the path area gains a quiet paper backdrop). */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
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
 * Authenticated shell, built around the study path. No sidebar and no tab bar: the path
 * itself (desktop) or a journey selector (phones) is the navigation, drawn quietly above the
 * page; Focus floats as a separate control; search, sync, settings and account sit aside.
 */
export function AppShell() {
  // The dashboard is Arabic-only, whatever language the public pages were viewed in.
  useDocumentLocale('ar');
  useTimerEngine();
  const title = usePageTitle();
  const location = useLocation();
  const scrolled = useScrolled();
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

  const quiet = 'grid size-9 place-items-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink';

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#app-main" className="sr-only z-[70] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        تخطَّ إلى المحتوى
      </a>
      <RouteProgress />

      <header className={cn('sticky top-0 z-30 transition-[background-color,box-shadow] duration-300', scrolled && 'bg-paper/90 shadow-[0_1px_0_#0d2a2010] backdrop-blur-md')}>
        <nav aria-label="التنقل الرئيسي" className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:h-[92px] lg:gap-6 lg:px-10">
          <Link to={ROUTES.app} className="shrink-0 rounded-lg" aria-label="Study Planner — اليوم">
            <BrandLogo size={32} priority />
          </Link>

          <div className="hidden min-w-0 flex-1 lg:block">
            <StudyPath />
          </div>
          <div className="min-w-0 flex-1 lg:hidden">
            <JourneyNav />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={openSearch} aria-label="بحث (Ctrl+K)" title="بحث · Ctrl K" className={quiet}>
              <Icon name="search" size={18} />
            </button>
            <span className="max-lg:hidden">
              <SyncIndicator compact />
            </span>
            <NavLink
              to={SETTINGS.to}
              aria-label={SETTINGS.label}
              title={SETTINGS.label}
              className={({ isActive }) =>
                cn(quiet, 'relative max-lg:hidden', isActive && 'text-brand-night after:absolute after:bottom-0.5 after:size-1 after:rounded-full after:bg-[#e0a94f]')
              }
            >
              <Icon name={SETTINGS.icon} size={18} />
            </NavLink>
            <AccountMenu />
          </div>
        </nav>
      </header>

      <main id="app-main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-4 outline-none sm:px-6 sm:pt-6 lg:px-10 lg:pb-24 lg:pt-2">
        <div key={location.pathname} className="motion-safe:animate-enter">
          <Outlet />
        </div>
      </main>

      <FocusControl />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
