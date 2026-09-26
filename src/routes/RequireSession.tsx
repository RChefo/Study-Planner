import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Skeleton } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { loginPath } from "./paths";

/** Dashboard guard: needs a signed-in session or an explicit "continue without an account". */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "loading") return <ShellSkeleton />;
  if (status === "anonymous")
    return (
      <Navigate
        to={loginPath({ next: location.pathname + location.search })}
        replace
      />
    );
  return children;
}

/** Placeholder in the shape of the shell and the Today page while the session loads. */
function ShellSkeleton() {
  return (
    <div
      dir="rtl"
      className="min-h-dvh bg-paper"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">جارٍ تحميل خطتك الدراسية…</span>
      <div>
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6 lg:h-[92px] lg:px-10">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex h-px flex-1 items-center justify-between border-t border-dashed border-[#c9d3cc] max-lg:hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="size-3 rounded-full" />
            ))}
          </div>
          <Skeleton className="size-8 rounded-full max-lg:ms-auto" />
        </div>
        <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <Skeleton className="h-56 rounded-3xl" />
              <div className="mt-10 space-y-6">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 max-lg:hidden">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
