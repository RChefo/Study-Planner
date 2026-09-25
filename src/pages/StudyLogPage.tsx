import { SectionHeader } from '@/components/ui/Surface';
import { StudyLogList, StudyLogSummary } from '@/features/study-log/StudyLogList';
import { usePlannerStore } from '@/stores/plannerStore';

export function StudyLogPage() {
  const logs = usePlannerStore(s => s.data.studyLog);
  return (
    <section>
      <SectionHeader title="سجل المذاكرة" description="كل فترة تركيز مكتملة أو محفوظة عند إيقاف المؤقت." />
      <StudyLogSummary logs={logs} />
      <StudyLogList logs={logs} />
    </section>
  );
}
