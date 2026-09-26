import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { PageHeader } from '@/components/ui/Card';
import { TimetableView } from '@/features/timetable/TimetableView';
import { useDocumentLocale } from '@/i18n/locale';
import { ROUTES } from '@/routes/paths';

const DESCRIPTION = 'تكنولوجيا الأمن السيبراني · الفرقة الثالثة · الفصل الأول 2026/2027';

/** In-app timetable. */
export function TimetablePage() {
  return <TimetableView header={controls => <PageHeader title="الجدول" description={DESCRIPTION} actions={controls} />} />;
}

/** Full-page timetable at /university-timetable, without the app shell or sign-in. */
export function StandaloneTimetablePage() {
  useDocumentLocale('ar');
  return (
    <div className="min-h-dvh bg-paper px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to={ROUTES.home} className="inline-flex rounded-lg no-underline" aria-label="Study Planner">
          <BrandLogo size={30} withName nameClassName="text-[15px] text-brand-night" />
        </Link>
        <div className="mt-8">
          <TimetableView
            header={controls => (
              <PageHeader eyebrow="جامعة حلوان التكنولوجية الدولية — كلية تكنولوجيا الصناعة والطاقة" title="الجدول الدراسي" description={DESCRIPTION} actions={controls} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
