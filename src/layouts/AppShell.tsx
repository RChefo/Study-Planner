import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { PathSlotContext, type PathSlotApi } from '@/components/wayfinding/pathSlotContext';

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
 * Authenticated shell, built around the study path. No sidebar and no tab bar: a thin
 * utility row on top, then each page's title, then the study path (portalled into the page's
 * PathSlot — full path on desktop, a compact always-visible path on phones), then content.
 * Focus floats as a separate control.
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

  // The study path renders under the current page's title (see PathSlot), else at the top.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [fallback, setFallback] = useState<HTMLElement | null>(null);
  const slotApi = useMemo<PathSlotApi>(
    () => ({ register: node => setSlot(node), unregister: node => setSlot(cur => (cur === node ? null : cur)) }),
    [],
  );
  const host = slot ?? fallback;

  const quiet = 'grid size-9 place-items-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink';

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#app-main" className="sr-only z-[70] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        تخطَّ إلى المحتوى
      </a>
      <RouteProgress />

      {/* A thin utility row: brand and tools only. Wayfinding lives under each page title. */}
      <header className={cn('sticky top-0 z-30 transition-[background-color,box-shadow] duration-300', scrolled && 'bg-paper/90 shadow-[0_1px_0_#0d2a2010] backdrop-blur-md')}>
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-10">
          <Link to={ROUTES.app} className="shrink-0 rounded-lg" aria-label="Study Planner — اليوم">
            <BrandLogo size={30} priority />
          </Link>
          <div className="ms-auto flex shrink-0 items-center gap-0.5">
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
              className={({ isActive }) => cn(quiet, 'relative', isActive && 'text-brand-night after:absolute after:bottom-0.5 after:size-1 after:rounded-full after:bg-[#e0a94f]')}
            >
              <Icon name={SETTINGS.icon} size={18} />
            </NavLink>
            <AccountMenu />
          </div>
        </div>
      </header>

      <PathSlotContext.Provider value={slotApi}>
        <main id="app-main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-2 outline-none sm:px-6 sm:pt-4 lg:px-10 lg:pb-24">
          {/* Fallback spot for screens without a title slot (focus mode, errors). */}
          {!slot && <div ref={setFallback} className="mb-12 max-lg:hidden" />}
          <div key={location.pathname} className="motion-safe:animate-enter">
            <Outlet />
          </div>
        </main>
      </PathSlotContext.Provider>
      {host &&
        createPortal(
          <nav aria-label="التنقل الرئيسي" className="max-lg:hidden">
            <StudyPath />
          </nav>,
          host,
        )}

      {/* Phones/tablets: the study path as a journey footer — a light strip, not a tab bar. */}
      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-paper/92 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto max-w-[440px]">
          <JourneyNav />
        </div>
      </nav>

      <FocusControl />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
