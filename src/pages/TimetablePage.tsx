import { Card, PageHeader } from '@/components/ui/Card';
import { TimetableView } from '@/features/timetable/TimetableView';

/** In-app timetable (previously an <iframe> of university-timetable.html). */
export function TimetablePage() {
  return (
    <div>
      <PageHeader title="جدول المحاضرات" description="جدول الفرقة الجامعي — للعرض فقط. اختر مجموعتك لعرض محاضراتك." />
      <Card className="overflow-hidden">
        <TimetableView />
      </Card>
    </div>
  );
}

/** Full-page timetable at /university-timetable, without the app shell or sign-in. */
export function StandaloneTimetablePage() {
  return <TimetableView />;
}
