import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoolifyAttribution } from '@/components/brand/LoolifyAttribution';
import { Icon } from '@/components/ui/Icon';
import { useDocumentLocale, useI18n } from '@/i18n/locale';
import { ROUTES } from '@/routes/paths';
import { AuthScene } from './AuthScene';

/**
 * Frame shared by /login and /auth/callback.
 * Desktop: an immersive evening scene on the reading-start side, the auth column beside it.
 * Phones/tablets: a short scene band with the brand on top, then the auth column — never two
 * squeezed columns.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  useDocumentLocale(locale);

  const quote = (
    <p className="font-display m-0 text-dawn">
      <span className="block">{t.auth.sceneLine1}</span>
      <span className="block text-[#f2c77e] ltr:italic">{t.auth.sceneLine2}</span>
    </p>
  );

  return (
    <div className="min-h-dvh bg-paper text-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,1fr)]">
      {/* Desktop scene */}
      <aside className="sticky top-0 hidden h-dvh p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[28px] bg-[#081f19] motion-safe:animate-[fade-up_0.9s_ease-out_both]">
          <AuthScene framing="tall" label={t.auth.sceneLabel} className="absolute inset-0 size-full" />
          <div className="relative flex h-full flex-col p-10 xl:p-12">
            <Link to={ROUTES.home} aria-label={t.auth.brandHome} className="self-start rounded-lg no-underline">
              <BrandLogo size={34} withName priority nameClassName="text-[17px] text-dawn!" />
            </Link>
            <div className="mt-[9vh] max-w-lg text-[clamp(2.2rem,3.4vw,3.6rem)] leading-[1.15] motion-safe:animate-rise rtl:leading-[1.45]" style={{ animationDelay: '300ms' }}>
              {quote}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Phone/tablet scene band */}
        <div className="relative h-[clamp(170px,48vw,250px)] overflow-hidden bg-[#081f19] lg:hidden">
          <AuthScene framing="band" label={t.auth.sceneLabel} className="absolute inset-0 size-full" />
          <Link to={ROUTES.home} aria-label={t.auth.brandHome} className="absolute start-4 top-4 rounded-lg no-underline">
            {/* The summit already carries the logo; the band names the product. */}
            <span dir="ltr" className="text-[15px] font-bold tracking-tight text-dawn">
              Study Planner
            </span>
          </Link>
        </div>

        <header className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-8 lg:pt-6">
          <Link to={ROUTES.home} className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-subtle no-underline transition-colors hover:bg-ink/5 hover:text-ink">
            <Icon name="chevron" size={15} />
            {t.auth.back}
          </Link>
          <LanguageSwitcher className="h-9 rounded-full text-[13px]" />
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pb-8 pt-6 sm:px-8 sm:pt-10 lg:items-center lg:pt-4">{children}</main>

        <footer className="flex justify-center px-5 pb-7">
          <LoolifyAttribution label={t.developedBy} />
        </footer>
      </div>
    </div>
  );
}
