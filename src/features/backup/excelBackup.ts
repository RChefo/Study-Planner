import type { WorkBook } from 'xlsx';
import type { PlannerData, SyncedPlannerData } from '@/types';
import { pickTimerSettings, timerState, useTimerStore } from '@/stores/timerStore';
import { plannerData, usePlannerStore } from '@/stores/plannerStore';
import { toast } from '@/stores/uiStore';

/**
 * Excel backup, byte-compatible with files produced by the original app:
 * readable sheets plus a hidden "بيانات الاستعادة" sheet holding the full JSON
 * (attachments included) split into 30 000-character chunks.
 */

const RESTORE_SHEET = 'بيانات الاستعادة';

function splitBackupText(text: string, size = 30000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; ) {
    let end = Math.min(i + size, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

export async function exportExcelBackup(): Promise<void> {
  try {
    const XLSX = await import('xlsx');
    const db: PlannerData = plannerData();
    const wb = XLSX.utils.book_new();
    const addSheet = (wbk: WorkBook, name: string, headers: string[], rows: unknown[][], widths: number[]) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = widths.map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wbk, ws, name);
    };

    const courseRows: unknown[][] = [];
    db.courses.forEach(c => {
      const lectures = c.topics ?? [];
      if (!lectures.length) courseRows.push([c.name, '', '', '']);
      else lectures.forEach(l => courseRows.push([c.name, l.name, l.done ? 'نعم' : 'لا', l.pdfName || '']));
    });
    addSheet(wb, 'المواد والمحاضرات', ['المادة', 'المحاضرة', 'تمت المذاكرة', 'ملف PDF'], courseRows, [28, 42, 18, 38]);
    addSheet(
      wb,
      'جلسات المذاكرة',
      ['المادة', 'الموضوع', 'التاريخ', 'وقت البداية', 'المدة بالدقائق', 'الأولوية', 'تفاصيل المذاكرة', 'المتطلب السابق', 'التالي', 'الحالة'],
      db.sessions.map(s => [
        db.courses.find(c => c.id === s.course)?.name || s.subject || '',
        s.topic,
        s.date,
        s.time,
        s.duration,
        s.priority,
        s.study,
        s.prev,
        s.next,
        s.status,
      ]),
      [26, 32, 16, 14, 18, 14, 46, 28, 28, 18],
    );
    addSheet(
      wb,
      'الالتزامات',
      ['المهمة', 'موعد التسليم', 'الوصف', 'الحالة', 'ملف PDF'],
      db.commitments.map(c => [c.name, c.dueDate, c.description, c.done ? 'منجز' : 'قيد التنفيذ', c.pdfName || '']),
      [34, 18, 60, 18, 40],
    );
    addSheet(
      wb,
      'سجل المذاكرة',
      ['المادة', 'الموضوع', 'بدأت في', 'انتهت في', 'المدة بالدقائق', 'مكتملة'],
      db.studyLog.map(l => [
        l.subject,
        l.topic,
        new Date(l.startedAt).toLocaleString('ar-EG'),
        new Date(l.endedAt).toLocaleString('ar-EG'),
        l.duration,
        l.completed ? 'نعم' : 'توقفت مبكرًا',
      ]),
      [26, 34, 26, 26, 18, 18],
    );
    addSheet(wb, 'الجدول الدراسي', ['الحالة'], [['ثابت داخل ملفات الموقع — للعرض فقط']], [52]);

    const backup: SyncedPlannerData = { ...db, timerSettings: pickTimerSettings(timerState()) };
    const parts = splitBackupText(JSON.stringify(backup));
    addSheet(wb, RESTORE_SHEET, ['رقم الجزء', 'بيانات النسخة الكاملة'], parts.map((v, i) => [i + 1, v]), [14, 80]);
    wb.Workbook ??= {};
    wb.Workbook.Sheets = wb.SheetNames.map(name => ({ name, Hidden: name === RESTORE_SHEET ? 1 : 0 }));
    XLSX.writeFile(wb, 'rafiq-study-backup.xlsx');
    toast('تم تنزيل نسخة Excel كاملة');
  } catch (err) {
    console.error(err);
    toast('تعذر إنشاء ملف Excel');
  }
}

export async function importExcelBackup(file: File): Promise<void> {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[RESTORE_SHEET];
    if (!ws) throw new Error('no backup data');
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false });
    const backup = rows
      .slice(1)
      .filter(r => r.length > 1)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(r => String(r[1]))
      .join('');
    const d = JSON.parse(backup) as Partial<SyncedPlannerData>;
    if (!Array.isArray(d.courses) || !Array.isArray(d.sessions)) throw new Error('invalid backup');
    if (d.timerSettings) {
      useTimerStore.getState().setTimer({ ...d.timerSettings, active: false, paused: false, endsAt: 0 });
      useTimerStore.getState().resetDraftSettings();
    }
    const restored: PlannerData = {
      courses: d.courses,
      sessions: d.sessions,
      commitments: d.commitments ?? [],
      studyLog: d.studyLog ?? [],
      timetable: d.timetable ?? null,
    };
    await usePlannerStore.getState().commit(() => restored);
    toast('تمت استعادة بياناتك وملفات PDF من Excel');
  } catch (err) {
    console.error(err);
    toast('ملف Excel غير صالح أو لا يحتوي نسخة رفيق الدراسة');
  }
}
