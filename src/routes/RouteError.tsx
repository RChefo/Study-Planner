import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Card, ErrorState } from '@/components/ui/Card';
import { ROUTES } from './paths';

/**
 * Shown instead of a blank page when a route fails to render or its code chunk fails to
 * load (e.g. after a deploy or while offline). `inline` keeps the app shell around it.
 */
export function RouteError({ inline = false }: { inline?: boolean }) {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);
  const chunkFailed = error instanceof Error && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? 'الصفحة غير موجودة' : chunkFailed ? 'تعذر تحميل هذه الصفحة' : 'حدث خطأ غير متوقع';
  const description = chunkFailed
    ? 'ربما انقطع الاتصال أو صدر تحديث جديد للتطبيق. أعد تحميل الصفحة للمتابعة؛ بياناتك محفوظة على هذا الجهاز.'
    : 'لم يتم فقدان أي بيانات. جرّب إعادة المحاولة، أو ارجع إلى الصفحة الرئيسية.';

  const body = (
    <>
      <ErrorState title={title} description={description} onRetry={() => window.location.reload()} retryLabel="إعادة تحميل الصفحة" />
      <div className="-mt-4 flex justify-center pb-8">
        <Button variant="ghost" onClick={() => navigate(ROUTES.app)}>
          العودة إلى الرئيسية
        </Button>
      </div>
    </>
  );

  if (inline) return <Card>{body}</Card>;
  return (
    <div dir="rtl" lang="ar" className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <BrandLogo size={56} />
        </div>
        <Card>{body}</Card>
      </div>
    </div>
  );
}
