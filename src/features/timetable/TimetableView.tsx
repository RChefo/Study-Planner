import { useEffect, useState } from 'react';
import type { Weekday } from '@/types';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { cn } from '@/lib/cn';
import { DAY_KEYS, DAY_NAMES, GROUPS, getWeekInfo, periodsFor, todayWeekday } from './schedule';
import { CopyScheduleDialog } from './CopyScheduleDialog';

function readSavedGroup(): string {
  const saved = readLocal(STORAGE_KEYS.timetableGroup) ?? '';
  return /^[1-8]$/.test(saved) ? saved : '';
}

/** Re-computes the section week every minute so it flips over on Friday. */
function useWeekInfo() {
  const [info, setInfo] = useState(getWeekInfo);
  useEffect(() => {
    const id = setInterval(() => setInfo(getWeekInfo()), 60000);
    return () => clearInterval(id);
  }, []);
  return info;
}

/** Read-only university timetable with day, group and alternating-section filters. */
export function TimetableView() {
  const info = useWeekInfo();
  const [day, setDay] = useState<Weekday>(todayWeekday);
  const [group, setGroup] = useState(readSavedGroup);
  const [copyOpen, setCopyOpen] = useState(false);
  const periods = periodsFor(day, group, info.section);

  const changeGroup = (value: string) => {
    const next = /^[1-8]$/.test(value) ? value : '';
    setGroup(next);
    writeLocal(STORAGE_KEYS.timetableGroup, next || null);
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-paper p-4 max-sm:p-2">
      <header className="mb-4 rounded-[18px] bg-hero px-6 py-5 text-right max-sm:rounded-[14px] max-sm:p-[13px]">
        <h1 className="mb-[5px] mt-0 text-[19px] font-bold max-sm:text-sm">جامعة حلوان التكنولوجية الدولية — كلية تكنولوجيا الصناعة والطاقة بالقاهرة</h1>
        <h2 className="mb-[5px] mt-0 text-base font-semibold text-brand max-sm:text-xs">تكنولوجيا الأمن السيبراني · الفصل الدراسي الأول 2026/2027</h2>
        <h3 className="m-0 text-[13px] font-medium text-muted">الفرقة الثالثة · اختار اليوم لعرض المحاضرات ومجموعاتها</h3>
      </header>

      <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-[15px] py-3 shadow-card max-sm:px-3 max-sm:py-[10px]">
        <div className="flex flex-col gap-0.5">
          <small className="text-[11px] text-muted">التناوب الأسبوعي التلقائي</small>
          <strong className="text-sm text-brand max-sm:text-[13px]">أسبوع {info.section}</strong>
        </div>
        <span className="whitespace-nowrap text-[11px] text-muted max-sm:text-[10px]">{info.label}</span>
      </div>

      <div className="mb-[10px] flex items-center gap-[10px] rounded-xl border border-line bg-white px-[13px] py-[10px] max-sm:flex-wrap max-sm:justify-between max-sm:px-[11px] max-sm:py-[9px]">
        <label htmlFor="groupSelect" className="text-xs font-semibold text-muted">
          عرض المجموعة
        </label>
        <select
          id="groupSelect"
          value={group}
          onChange={e => changeGroup(e.target.value)}
          className="min-w-[150px] rounded-[9px] border border-line bg-stripe px-[10px] py-[7px] text-xs text-ink outline-brand max-sm:min-w-[130px]"
        >
          <option value="">كل المجموعات</option>
          {GROUPS.map(n => (
            <option key={n} value={n}>
              المجموعة {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setCopyOpen(true)}
          className="mr-auto rounded-[9px] border-0 bg-brand px-3 py-2 text-xs font-semibold text-white max-sm:mr-0"
        >
          نسخ الجدول
        </button>
      </div>

      <nav className="mb-1.5 flex gap-2 overflow-x-auto px-px pb-[10px] pt-0.5" aria-label="اختيار اليوم">
        {DAY_KEYS.map(key => (
          <button
            key={key}
            type="button"
            aria-pressed={key === day}
            onClick={() => setDay(key)}
            className={cn(
              'flex-none rounded-[11px] border px-[17px] py-[9px] text-[13px] transition max-sm:px-[13px] max-sm:py-2 max-sm:text-xs',
              key === day
                ? 'border-brand bg-brand text-white shadow-[0_5px_14px_#286b5626]'
                : 'border-line bg-white text-muted hover:border-[#a9cbb8] hover:text-brand',
            )}
          >
            {DAY_NAMES[key]}
          </button>
        ))}
      </nav>

      <div className="mx-0.5 mb-3 flex items-center justify-between">
        <h2 className="m-0 text-[17px] font-bold max-sm:text-[15px]">جدول {DAY_NAMES[day]}</h2>
        <span className="rounded-[20px] bg-mint px-[10px] py-[5px] text-xs text-brand">{periods.length} فترات دراسية</span>
      </div>

      {periods.length ? (
        <div className="grid gap-[10px]">
          {periods.map(p => (
            <article key={p.period} className="rounded-[15px] border border-line bg-white px-[15px] py-[13px] shadow-card max-sm:rounded-[13px] max-sm:p-[11px]">
              <div className="mb-[10px] flex items-center justify-between gap-[10px]">
                <span className="text-[13px] font-bold text-brand">الفترة {p.period}</span>
                <span className="rounded-lg bg-[#f0f5f1] px-[9px] py-[5px] text-xs text-muted" dir="ltr">
                  {p.time}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                {p.classes.map(cls => (
                  <article key={cls.key} className="min-w-0 rounded-[11px] border border-[#edf0ed] bg-stripe px-[11px] py-[10px] max-sm:p-[9px]">
                    <span className="mb-1.5 inline-block rounded-[20px] bg-mint px-2 py-[3px] text-[10px] font-bold text-brand">{cls.label}</span>
                    {cls.subjects.map((s, i) => (
                      <div key={i}>
                        <span
                          className={cn(
                            'block text-xs font-bold leading-[1.5] text-ink [overflow-wrap:anywhere]',
                            s.secondary && 'mt-[7px] border-t border-dashed border-[#dce5df] pt-1.5',
                          )}
                        >
                          {s.title}
                        </span>
                        {s.meta && <span className="mt-0.5 block text-[10px] font-medium leading-[1.5] text-muted [overflow-wrap:anywhere]">{s.meta}</span>}
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[15px] border border-dashed border-[#cfd9d2] bg-white px-[15px] py-7 text-center text-[13px] text-muted">
          لا توجد محاضرات مسجلة لهذا اليوم.
        </div>
      )}

      <div className="mt-3 rounded-[13px] border border-line bg-white px-[15px] py-3 text-center text-xs text-muted">
        <span className="mx-[10px] my-[3px] inline-block">
          <span className="font-bold text-brand">(1)</span> = محاضرة المجموعة الأولى
        </span>
        <span className="mx-[10px] my-[3px] inline-block">
          <span className="font-bold text-brand">(2)</span> = محاضرة المجموعة الثانية
        </span>
        <span className="mx-[10px] my-[3px] inline-block">
          <span className="font-bold text-brand">(1&amp;2)</span> = محاضرة مشتركة للمجموعتين
        </span>
      </div>

      {copyOpen && <CopyScheduleDialog onClose={() => setCopyOpen(false)} initialDay={day} initialGroup={group} />}
    </div>
  );
}
