import { Panel, SectionHeader } from '@/components/ui/Surface';
import { TimetableView } from '@/features/timetable/TimetableView';

/** In-app timetable tab (previously an <iframe> of university-timetable.html). */
export function TimetablePage() {
  return (
    <section>
      <SectionHeader title="الجدول الدراسي" description="الجدول الجامعي المرفق — للعرض فقط." />
      <Panel className="overflow-hidden p-0">
        <TimetableView />
      </Panel>
    </section>
  );
}

/** Full-page timetable at /university-timetable, without the app shell or sign-in. */
export function StandaloneTimetablePage() {
  return <TimetableView />;
}
