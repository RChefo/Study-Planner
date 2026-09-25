import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoolifyAttribution } from '@/components/brand/LoolifyAttribution';
import { Icon } from '@/components/ui/Icon';
import { useDocumentLocale, useI18n } from '@/i18n/locale';
import { ROUTES } from '@/routes/paths';

/** Full-height frame shared by /login and /auth/callback. */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  useDocumentLocale(locale);
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-paper text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_65%_at_50%_0%,#dcefe3_0%,transparent_100%)]"
      />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          to={ROUTES.home}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-subtle no-underline transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Icon name="arrow" size={16} className="rotate-180" />
          {t.auth.back}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:items-center sm:pt-0">{children}</main>
      <footer className="relative flex justify-center px-4 pb-8">
        <LoolifyAttribution label={t.developedBy} />
      </footer>
    </div>
  );
}
