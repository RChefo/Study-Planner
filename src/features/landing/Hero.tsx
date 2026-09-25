import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/LinkButton';
import { useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, loginPath } from '@/routes/paths';
import { ProductPreview } from './ProductPreview';

const reveal = 'motion-safe:animate-fade-up';

export function Hero() {
  const { t } = useI18n();
  const hasSession = useAuthStore(s => s.status === 'authenticated' || s.status === 'local');

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* soft brand glow behind the logo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(50%_60%_at_50%_0%,#dcefe3_0%,transparent_100%)]"
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <div className={reveal}>
          <span className="relative inline-flex rounded-[28px] bg-white/70 p-3 shadow-lift ring-1 ring-line sm:p-4">
            <BrandLogo size={88} priority className="max-sm:[&_img]:w-[68px]" />
          </span>
        </div>

        <p className={`${reveal} mt-6 inline-flex items-center gap-2 rounded-full border border-[#cfe3d6] bg-white/80 px-3 py-1 text-[13px] font-medium text-brand`} style={{ animationDelay: '60ms' }}>
          <span className="size-1.5 rounded-full bg-brand-bright" aria-hidden="true" />
          {t.hero.eyebrow}
        </p>

        <h1
          id="hero-title"
          className={`${reveal} mx-auto mt-5 max-w-3xl text-balance text-[2.1rem] font-bold leading-[1.2] tracking-tight text-ink sm:text-5xl lg:text-[3.6rem] lg:leading-[1.12]`}
          style={{ animationDelay: '120ms' }}
        >
          {t.hero.title}{' '}
          <span className="bg-linear-to-r from-brand-deep to-brand-bright bg-clip-text text-transparent rtl:bg-linear-to-l">{t.hero.titleAccent}</span>
        </h1>

        <p className={`${reveal} mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-subtle sm:text-lg`} style={{ animationDelay: '180ms' }}>
          {t.hero.body}
        </p>

        <div className={`${reveal} mt-8 flex flex-col items-stretch justify-center gap-3 xs:flex-row xs:items-center`} style={{ animationDelay: '240ms' }}>
          {hasSession ? (
            <LinkButton to={ROUTES.app} size="lg">
              {t.nav.openApp} <Icon name="arrow" size={18} />
            </LinkButton>
          ) : (
            <>
              <LinkButton to={loginPath({ mode: 'signup' })} size="lg">
                {t.hero.primary} <Icon name="arrow" size={18} />
              </LinkButton>
              <LinkButton to={loginPath()} size="lg" variant="secondary">
                {t.hero.secondary}
              </LinkButton>
            </>
          )}
        </div>
        <p className={`${reveal} mt-4 text-[13px] text-subtle`} style={{ animationDelay: '280ms' }}>
          {t.hero.note}
        </p>

        <div className={`${reveal} mt-14 sm:mt-16`} style={{ animationDelay: '340ms' }}>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
