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
      <section aria-labelledby="callback-title" className="w-full max-w-[400px] motion-safe:animate-enter">
        <BrandLogo size={48} priority className="mb-6 max-lg:hidden" />
        {error ? (
          <>
            <h1 id="callback-title" className="font-display m-0 text-[2.4rem] font-normal leading-[1.2] text-brand-night rtl:leading-[1.4]">
              {t.auth.errorTitle}
            </h1>
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f8ebe0] px-4 py-3.5 text-sm leading-relaxed text-[#7a3413]">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
              <span>{t.errors[error]}</span>
            </div>
            <div className="mt-8 grid gap-3">
              <Link
                to={loginPath({ next })}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand-night text-sm font-semibold text-dawn no-underline transition-colors hover:bg-brand-deep"
              >
                <Icon name="refresh" size={15} /> {t.auth.tryAgain}
              </Link>
              <Link
                to={ROUTES.home}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium text-ink no-underline transition-colors hover:bg-white"
              >
                {t.auth.back}
              </Link>
            </div>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <h1 id="callback-title" className="font-display m-0 text-[2.4rem] font-normal leading-[1.2] text-brand-night rtl:leading-[1.4]">
              {t.auth.callbackTitle}
            </h1>
            <p className="m-0 mt-3 flex items-center gap-2.5 text-[15px] text-subtle">
              <Spinner className="size-4 text-brand" /> {t.auth.callbackBody}
            </p>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
