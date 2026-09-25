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

  return (
    <AuthShell>
      <section aria-labelledby="auth-title" aria-busy={!!busy} className="w-full max-w-[420px] motion-safe:animate-fade-up">
        <div className="rounded-3xl border border-line bg-white px-6 py-8 shadow-hero sm:px-9 sm:py-10">
          <div className="text-center">
            <BrandLogo size={64} priority className="mx-auto" />
            <h1 id="auth-title" className="mb-0 mt-5 text-2xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mb-0 mt-2 text-sm leading-relaxed text-subtle">{body}</p>
          </div>

          {shownError && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#f1d3bf] bg-[#fdf4ee] px-3.5 py-3 text-sm leading-relaxed text-[#8a4a1f]">
              <Icon name="alert" size={18} className="mt-0.5" />
              <span>{t.errors[shownError]}</span>
            </div>
          )}

          <div className="mt-7 grid gap-3">
            {/* Google */}
            {!configLoaded ? (
              <div className={cn(providerButton, 'border border-line bg-stripe text-subtle')} aria-live="polite">
                <Spinner /> {t.auth.loadingProviders}
              </div>
            ) : googleUnavailable ? (
              <ProviderUnavailable icon={<GoogleIcon className="size-[18px]" />} label={t.auth.google} note={t.auth.googleNotConfigured} />
            ) : busy === 'google' ? (
              <div className={cn(providerButton, 'border border-[#dadce0] bg-white text-[#3c4043]')} role="status">
                <Spinner className="text-brand" /> {t.auth.signingIn}
              </div>
            ) : (
              <div className={cn(busy && 'pointer-events-none opacity-60')}>
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
                aria-disabled={!configLoaded || !!busy}
                onClick={e => {
                  if (!configLoaded || busy) return e.preventDefault();
                  setError(null);
                  setBusy('discord');
                }}
                className={cn(
                  providerButton,
                  'bg-discord text-white hover:bg-discord-hover',
                  (!configLoaded || (busy && busy !== 'discord')) && 'pointer-events-none opacity-60',
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

          <div className="my-6 flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            {t.auth.or}
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={onLocal}
            disabled={!!busy}
            aria-describedby="local-hint"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-semibold text-ink transition-colors hover:bg-stripe disabled:opacity-60"
          >
            <Icon name="device" size={16} /> {t.auth.local}
          </button>
          <p id="local-hint" className="mb-0 mt-2 text-center text-xs leading-relaxed text-subtle">
            {t.auth.localHint}
          </p>

          <p className="mb-0 mt-7 flex items-center justify-center gap-1.5 border-t border-line pt-5 text-center text-xs leading-relaxed text-subtle">
            <Icon name="shield" size={14} className="text-brand" />
            {t.auth.secure}
          </p>
        </div>

        <p className="mb-0 mt-6 text-center text-sm text-subtle">
          {mode === 'signup' ? t.auth.toSignIn : t.auth.toSignUp}{' '}
          <Link
            to={loginPath({ mode: mode === 'signup' ? undefined : 'signup', next })}
            className="rounded font-semibold text-brand underline-offset-4 hover:underline"
          >
            {mode === 'signup' ? t.auth.toSignInLink : t.auth.toSignUpLink}
          </Link>
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
