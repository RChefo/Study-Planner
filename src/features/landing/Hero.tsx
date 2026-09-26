import { useRef, type CSSProperties } from 'react';
import { useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, loginPath } from '@/routes/paths';
import { PathCta, TextCta } from './CtaLinks';
import { HeroScene } from './HeroScene';
import { useSceneMotion } from './useSceneMotion';

const rise = 'motion-safe:animate-rise';

/** Clouds drifting slowly across the dawn sky, behind everything else. */
function Sky() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="parallax absolute inset-x-0 top-[6%] h-[48%]" style={{ '--depth-x': '4px', '--depth-s': '0.2px' } as CSSProperties}>
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" className="size-full blur-[14px]" focusable="false">
          <g fill="#fffdf6" className="motion-safe:animate-drift">
            <ellipse cx="220" cy="120" rx="190" ry="34" opacity="0.8" />
            <ellipse cx="330" cy="150" rx="140" ry="26" opacity="0.6" />
            <ellipse cx="1320" cy="90" rx="220" ry="38" opacity="0.75" />
          </g>
          <g fill="#fffdf6" className="motion-safe:animate-drift" style={{ animationDuration: '85s', animationDirection: 'alternate-reverse' }}>
            <ellipse cx="900" cy="60" rx="160" ry="22" opacity="0.55" />
            <ellipse cx="1480" cy="260" rx="170" ry="28" opacity="0.5" />
            <ellipse cx="90" cy="300" rx="150" ry="26" opacity="0.45" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * One screen, top to bottom: the headline in the sky, the landscape filling whatever
 * height is left, and the actions standing on the dark foot of the hill.
 */
export function Hero() {
  const { t } = useI18n();
  const hasSession = useAuthStore(s => s.status === 'authenticated' || s.status === 'local');
  const ref = useRef<HTMLElement>(null);
  useSceneMotion(ref);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative flex min-h-[max(680px,100svh)] flex-col overflow-hidden bg-linear-to-b from-dawn via-[#eef1e7] to-[#e4ece2]"
    >
      <Sky />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-24 text-center sm:px-6 md:pt-28">
        <p className={`${rise} m-0 inline-flex items-center gap-3 text-[13px] font-medium tracking-wide text-brand sm:text-sm`}>
          <span aria-hidden="true" className="h-px w-8 bg-brand/50" />
          {t.hero.eyebrow}
          <span aria-hidden="true" className="h-px w-8 bg-brand/50" />
        </p>
        <h1
          id="hero-title"
          className="font-display m-0 mt-4 text-balance text-[clamp(2.6rem,6.6vw,5.75rem)] font-normal leading-[1.02] tracking-[-0.01em] text-brand-night rtl:leading-[1.22] rtl:tracking-normal"
        >
          <span className={`${rise} block`} style={{ animationDelay: '120ms' }}>
            {t.hero.titleLine1}
          </span>
          <span className={`${rise} block italic text-brand rtl:not-italic`} style={{ animationDelay: '280ms' }}>
            {t.hero.titleLine2}
          </span>
        </h1>
      </div>

      <HeroScene />

      {/* The foot of the hill: actions stand on solid ground. */}
      <div className="relative z-10 -mt-px bg-brand-night px-5 pb-10 text-center sm:px-6 sm:pb-12">
        <div className={`${rise} flex flex-wrap items-center justify-center gap-x-6 gap-y-2`} style={{ animationDelay: '650ms' }}>
          {hasSession ? (
            <PathCta to={ROUTES.app}>{t.nav.openApp}</PathCta>
          ) : (
            <>
              <PathCta to={loginPath({ mode: 'signup' })}>{t.hero.primary}</PathCta>
              <TextCta to={loginPath()}>{t.hero.secondary}</TextCta>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
