import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Skeleton } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { loginPath } from './paths';

/** Dashboard guard: needs a signed-in session or an explicit "continue without an account". */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useAuthStore(s => s.status);
  const location = useLocation();

  if (status === 'loading') return <ShellSkeleton />;
  if (status === 'anonymous') return <Navigate to={loginPath({ next: location.pathname + location.search })} replace />;
  return children;
}

/** Placeholder in the shape of the app while the session and data load (no blank screen). */
function ShellSkeleton() {
  return (
    <div dir="rtl" className="min-h-dvh bg-paper" role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل خطتك الدراسية…</span>
      <div className="fixed inset-y-0 start-0 hidden w-60 border-e border-line bg-white p-4 lg:block">
        <Skeleton className="h-8 w-36" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
      <div className="lg:ps-60">
        <div className="h-16 border-b border-line" />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
