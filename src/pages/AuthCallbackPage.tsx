import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { AuthShell } from '@/features/auth/AuthShell';
import { useI18n } from '@/i18n/locale';
import { isAuthErrorCode, type AuthErrorCode } from '@/i18n/messages';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
import { ROUTES, loginPath, safeNextPath } from '@/routes/paths';

/**
 * Landing point after server-side OAuth (Discord). On success the server has already set the
 * session cookie, so the normal startup check picks it up and loads the user's data; this page
 * waits for that and then continues. On failure the server passes a short error code.
 */
export function AuthCallbackPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));
  const errorParam = params.get('error');
  const status = useAuthStore(s => s.status);
  const notice = useAuthStore(s => s.notice);
  const done = useRef(false);

  let error: AuthErrorCode | null = null;
  if (errorParam) error = isAuthErrorCode(errorParam) ? errorParam : 'server_error';
  else if (status === 'anonymous') error = notice === 'sync_failed' || notice === 'service_unavailable' ? notice : 'session_missing';

  useEffect(() => {
    if (error || done.current) return;
    if (status === 'authenticated' || status === 'local') {
      done.current = true;
      if (status === 'authenticated') toast('تم تسجيل الدخول ومزامنة بياناتك');
      navigate(next, { replace: true });
    }
  }, [error, status, next, navigate]);

  return (
    <AuthShell>
      <section aria-labelledby="callback-title" className="w-full max-w-[420px] motion-safe:animate-fade-up">
        <div className="rounded-3xl border border-line bg-white px-6 py-10 text-center shadow-hero sm:px-9">
          <BrandLogo size={64} priority className="mx-auto" />
          {error ? (
            <>
              <h1 id="callback-title" className="mb-0 mt-5 text-2xl font-bold tracking-tight text-ink">
                {t.auth.errorTitle}
              </h1>
              <p role="alert" className="mx-auto mb-0 mt-3 max-w-sm text-sm leading-relaxed text-subtle">
                {t.errors[error]}
              </p>
              <div className="mt-7 grid gap-3">
                <Link
                  to={loginPath({ next })}
                  className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-deep"
                >
                  {t.auth.tryAgain}
                </Link>
                <Link
                  to={ROUTES.home}
                  className="flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-semibold text-ink no-underline transition-colors hover:bg-stripe"
                >
                  <Icon name="arrow" size={16} className="rotate-180" /> {t.auth.back}
                </Link>
              </div>
            </>
          ) : (
            <div role="status" aria-live="polite">
              <h1 id="callback-title" className="mb-0 mt-5 flex items-center justify-center gap-2.5 text-xl font-bold text-ink">
                <Spinner className="size-5 text-brand" /> {t.auth.callbackTitle}
              </h1>
              <p className="mb-0 mt-2 text-sm text-subtle">{t.auth.callbackBody}</p>
            </div>
          )}
        </div>
      </section>
    </AuthShell>
  );
}
