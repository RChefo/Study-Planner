import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { loginPath } from './paths';

/** Dashboard guard: needs a signed-in session or an explicit "continue without an account". */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useAuthStore(s => s.status);
  const location = useLocation();

  if (status === 'loading') return <SplashScreen />;
  if (status === 'anonymous') return <Navigate to={loginPath({ next: location.pathname + location.search })} replace />;
  return children;
}

function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <BrandLogo size={72} priority />
        <Spinner className="size-5 text-brand" />
        <span className="sr-only">جارٍ التحميل…</span>
      </div>
    </div>
  );
}
