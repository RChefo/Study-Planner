import { Navigate } from 'react-router';
import { useDocumentLocale, useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/routes/paths';
import { SiteHeader } from '@/features/landing/SiteHeader';
import { Hero } from '@/features/landing/Hero';
import { Closing, Extras, PathChapters, Statement } from '@/features/landing/Story';
import { SiteFooter } from '@/features/landing/SiteFooter';

/** Public entry page. Signed-in users go straight to their planner. */
export function LandingPage() {
  const { t, locale } = useI18n();
  useDocumentLocale(locale);
  const status = useAuthStore(s => s.status);
  if (status === 'authenticated') return <Navigate to={ROUTES.app} replace />;

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t.skipToContent}
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Statement />
        <PathChapters />
        <Extras />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
