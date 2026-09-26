import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { DiscordIcon, GoogleIcon } from '@/components/brand/ProviderIcons';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { AuthShell } from '@/features/auth/AuthShell';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { continueLocalMode, signInWithGoogleCredential } from '@/features/auth/authFlow';
import { useI18n } from '@/i18n/locale';
import { isAuthErrorCode, type AuthErrorCode } from '@/i18n/messages';
import { discordSignInUrl } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { loginPath, safeNextPath } from '@/routes/paths';
import { cn } from '@/lib/cn';

type Busy = 'google' | 'discord' | null;

const providerButton =
  'relative flex h-10 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold no-underline transition-colors duration-150';

export function LoginPage() {
  const { t, locale } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const next = safeNextPath(params.get('next'));
  const errorParam = params.get('error');

  const status = useAuthStore(s => s.status);
  const configLoaded = useAuthStore(s => s.configLoaded);
  const googleClientId = useAuthStore(s => s.googleClientId);
  const discordEnabled = useAuthStore(s => s.discordEnabled);
  const notice = useAuthStore(s => s.notice);

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<AuthErrorCode | null>(isAuthErrorCode(errorParam) ? errorParam : null);
  const shownError = error ?? notice;

  // Returning from Discord via the browser's back button restores this page from cache.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setBusy(null);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  if (status === 'authenticated' && !busy) return <Navigate to={next} replace />;

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setBusy('google');
    const result = await signInWithGoogleCredential(credential);
    if (result.ok) navigate(next, { replace: true });
    else {
      setError(result.error);
      setBusy(null);
    }
  };

  const onLocal = () => {
    continueLocalMode();
    navigate(next, { replace: true });
  };

  const title = mode === 'signup' ? t.auth.signUpTitle : t.auth.signInTitle;
  const body = mode === 'signup' ? t.auth.signUpBody : t.auth.signInBody;
  const googleUnavailable = configLoaded && !googleClientId;
  const discordUnavailable = configLoaded && !discordEnabled;

  const stagger = (ms: number) => ({ animationDelay: `${ms}ms` });

  return (
    <AuthShell>
      <section aria-labelledby="auth-title" aria-busy={!!busy} className="w-full max-w-[400px]">
        <BrandLogo size={48} className="mb-6 motion-safe:animate-enter max-lg:hidden" />
        <h1 id="auth-title" className="font-display m-0 text-[2.5rem] font-normal leading-[1.15] text-brand-night motion-safe:animate-enter rtl:leading-[1.4] sm:text-[2.9rem]" style={stagger(140)}>
          {title}
        </h1>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-subtle motion-safe:animate-enter" style={stagger(200)}>
          {body}
        </p>

        {shownError && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f8ebe0] px-4 py-3.5 text-sm leading-relaxed text-[#7a3413] motion-safe:animate-enter">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            <span>{t.errors[shownError]}</span>
          </div>
        )}

        <div className="mt-8 grid gap-3 motion-safe:animate-enter" style={stagger(260)}>
          {/* Google: Google's own rendered button (branding rules), in a pill slot */}
          {!configLoaded ? (
            <div className={cn(providerButton, 'border border-line bg-white text-subtle')} aria-live="polite">
              <Spinner /> {t.auth.loadingProviders}
            </div>
          ) : googleUnavailable ? (
            <ProviderUnavailable icon={<GoogleIcon className="size-[18px]" />} label={t.auth.google} note={t.auth.googleNotConfigured} />
          ) : busy === 'google' ? (
            <div className={cn(providerButton, 'border border-[#dadce0] bg-white text-[#3c4043]')} role="status">
              <Spinner className="text-brand" /> {t.auth.signingIn}
            </div>
          ) : (
            <div className={cn('transition-opacity', busy && 'pointer-events-none opacity-50')}>
              <GoogleSignInButton
                clientId={googleClientId}
                locale={locale}
                label={t.auth.google}
                onCredential={c => void onGoogleCredential(c)}
                onLoadError={() => setError('google_script')}
              />
            </div>
          )}

          {/* Discord: full-page redirect into the server-side OAuth flow */}
          {discordUnavailable ? (
            <ProviderUnavailable icon={<DiscordIcon className="size-5" />} label={t.auth.discord} note={t.auth.discordNotConfigured} />
          ) : (
            <a
              href={configLoaded && !busy ? discordSignInUrl(next) : undefined}
              role={!configLoaded || busy ? 'link' : undefined}
              aria-disabled={!configLoaded || !!busy}
              onClick={e => {
                if (!configLoaded || busy) return e.preventDefault();
                setError(null);
                setBusy('discord');
              }}
              className={cn(
                providerButton,
                'bg-discord text-white shadow-[0_8px_20px_-12px_#5865f2] hover:bg-discord-hover active:scale-[0.99]',
                (!configLoaded || (busy && busy !== 'discord')) && 'pointer-events-none opacity-50',
              )}
            >
              {busy === 'discord' ? (
                <>
                  <Spinner /> <span role="status">{t.auth.discordRedirecting}</span>
                </>
              ) : (
                <>
                  <DiscordIcon className="size-5" /> {t.auth.discord}
                </>
              )}
            </a>
          )}
        </div>

        <div className="my-7 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          {t.auth.or}
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="motion-safe:animate-enter" style={stagger(320)}>
          <button
            type="button"
            onClick={onLocal}
            disabled={!!busy}
            aria-describedby="local-hint"
            className="group flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-transparent text-sm font-medium text-ink transition-colors hover:border-[#cfd9d2] hover:bg-white disabled:opacity-50"
          >
            <Icon name="device" size={16} className="text-subtle" /> {t.auth.local}
          </button>
          <p id="local-hint" className="mb-0 mt-2 text-center text-xs leading-relaxed text-subtle">
            {t.auth.localHint}
          </p>
        </div>

        <p className="mb-0 mt-8 text-center text-sm text-subtle">
          {mode === 'signup' ? t.auth.toSignIn : t.auth.toSignUp}{' '}
          <Link
            to={loginPath({ mode: mode === 'signup' ? undefined : 'signup', next })}
            className="rounded font-semibold text-brand underline-offset-4 hover:underline"
          >
            {mode === 'signup' ? t.auth.toSignInLink : t.auth.toSignUpLink}
          </Link>
        </p>

        <p className="mb-0 mt-6 text-balance border-t border-line pt-5 text-center text-xs leading-relaxed text-subtle">
          <Icon name="shield" size={14} className="me-1.5 text-brand" />
          {t.auth.secure}
        </p>
      </section>
    </AuthShell>
  );
}

function ProviderUnavailable({ icon, label, note }: { icon: ReactNode; label: string; note: string }) {
  const noteId = useId();
  return (
    <div>
      <button type="button" disabled aria-describedby={noteId} className={cn(providerButton, 'cursor-not-allowed border border-line bg-stripe text-[#6f7c77]')}>
        <span className="opacity-60 grayscale">{icon}</span> {label}
      </button>
      <p id={noteId} className="mb-0 mt-1.5 text-center text-xs text-subtle">
        {note}
      </p>
    </div>
  );
}
