import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, loginPath } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { LANDING_SECTIONS } from './sections';

const pill = 'inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold no-underline transition-colors';

/** Transparent over the hero; settles onto paper with a hairline once the page scrolls. */
export function SiteHeader() {
  const { t } = useI18n();
  const hasSession = useAuthStore(s => s.status === 'authenticated' || s.status === 'local');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  // Closing on a wide viewport (menu left open while resizing) keeps the page usable.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const onChange = () => wide.matches && setMenuOpen(false);
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled ? 'border-b border-line/80 bg-paper/90 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to={ROUTES.home} className="rounded-lg no-underline" aria-label="Study Planner">
          <BrandLogo size={36} withName priority nameClassName="text-[17px] text-brand-night max-xs:hidden" />
        </Link>

        <nav aria-label={t.nav.menu} className="hidden items-center gap-1 lg:flex">
          {LANDING_SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full px-4 py-2 text-sm font-medium text-subtle no-underline transition-colors hover:text-brand-night">
              {t.nav[s.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher className="rounded-full" />
          {hasSession ? (
            <Link to={ROUTES.app} className={cn(pill, 'bg-brand-night text-dawn hover:bg-brand-deep max-sm:hidden')}>
              {t.nav.openApp}
            </Link>
          ) : (
            <>
              <Link to={loginPath()} className={cn(pill, 'px-3 text-subtle hover:text-brand-night max-lg:hidden')}>
                {t.nav.signIn}
              </Link>
              <Link to={loginPath({ mode: 'signup' })} className={cn(pill, 'bg-brand-night text-dawn hover:bg-brand-deep max-sm:hidden')}>
                {t.nav.getStarted}
              </Link>
            </>
          )}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.openMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="grid size-10 place-items-center rounded-full text-brand-night transition-colors hover:bg-ink/5 lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </div>

      {/* Mobile menu: a native modal dialog (focus trapped, Escape closes, background inert). */}
      <dialog
        ref={dialogRef}
        aria-label={t.nav.menu}
        onClose={() => {
          setMenuOpen(false);
          toggleRef.current?.focus();
        }}
        onClick={e => e.target === e.currentTarget && closeMenu()}
        className="m-0 ms-auto h-dvh max-h-none w-[min(22rem,100%)] max-w-none border-0 bg-paper p-0 text-ink backdrop:bg-brand-night/40 backdrop:backdrop-blur-sm open:flex open:flex-col motion-safe:open:animate-fade-up"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <BrandLogo size={32} withName nameClassName="text-base text-brand-night" />
          <button
            type="button"
            onClick={closeMenu}
            aria-label={t.nav.closeMenu}
            className="grid size-10 place-items-center rounded-full text-brand-night transition-colors hover:bg-ink/5"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav aria-label={t.nav.menu} className="flex-1 px-4">
          <ul className="m-0 list-none border-t border-line p-0">
            {LANDING_SECTIONS.map((s, i) => (
              <li key={s.id} className="border-b border-line">
                <a
                  href={`#${s.id}`}
                  onClick={closeMenu}
                  className="flex items-baseline gap-4 py-5 text-brand-night no-underline"
                >
                  <span className="text-xs tabular-nums text-muted">0{i + 1}</span>
                  <span className="font-display text-3xl">{t.nav[s.key]}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {hasSession ? (
            <Link to={ROUTES.app} className={cn(pill, 'h-12 bg-brand-night text-dawn')}>
              {t.nav.openApp}
            </Link>
          ) : (
            <>
              <Link to={loginPath({ mode: 'signup' })} className={cn(pill, 'h-12 bg-brand-night text-dawn')}>
                {t.nav.getStarted}
              </Link>
              <Link to={loginPath()} className={cn(pill, 'h-12 border border-line text-brand-night')}>
                {t.nav.signIn}
              </Link>
            </>
          )}
        </div>
      </dialog>
    </header>
  );
}
