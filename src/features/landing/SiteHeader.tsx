import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LinkButton } from '@/components/ui/LinkButton';
import { useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, loginPath } from '@/routes/paths';

export function SiteHeader() {
  const { t } = useI18n();
  const hasSession = useAuthStore(s => s.status === 'authenticated' || s.status === 'local');

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to={ROUTES.home} className="rounded-lg no-underline" aria-label="Study Planner">
          <BrandLogo size={34} withName priority nameClassName="text-[17px] max-xs:hidden" />
        </Link>

        <nav aria-label={t.nav.menu} className="hidden items-center gap-1 lg:flex">
          <a href="#features" className="rounded-lg px-3 py-2 text-sm font-medium text-subtle no-underline transition-colors hover:bg-ink/5 hover:text-ink">
            {t.nav.features}
          </a>
          <a href="#how-it-works" className="rounded-lg px-3 py-2 text-sm font-medium text-subtle no-underline transition-colors hover:bg-ink/5 hover:text-ink">
            {t.nav.howItWorks}
          </a>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          {hasSession ? (
            <LinkButton to={ROUTES.app}>{t.nav.openApp}</LinkButton>
          ) : (
            <>
              <LinkButton to={loginPath()} variant="ghost" className="max-sm:hidden">
                {t.nav.signIn}
              </LinkButton>
              <LinkButton to={loginPath({ mode: 'signup' })}>{t.nav.getStarted}</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
