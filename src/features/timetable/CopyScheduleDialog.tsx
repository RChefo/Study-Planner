import { useState } from 'react';
import type { Weekday } from '@/types';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/stores/uiStore';
import { DAY_KEYS, DAY_NAMES, GROUPS, buildScheduleText, getWeekInfo } from './schedule';

interface Props {
  onClose: () => void;
  initialDay: Weekday;
  initialGroup: string;
}

type Mode = 'all' | 'selected';

function ModeToggle({ name, value, onChange, allLabel, pickLabel }: { name: string; value: Mode; onChange: (m: Mode) => void; allLabel: string; pickLabel: string }) {
  return (
    <div className="mb-[13px] flex gap-2">
      {(['all', 'selected'] as const).map(mode => (
        <label key={mode} className="flex flex-1 cursor-pointer items-center gap-[7px] rounded-[10px] border border-line bg-stripe p-[10px] text-xs">
          <input type="radio" name={name} className="accent-brand" checked={value === mode} onChange={() => onChange(mode)} />
          {mode === 'all' ? allLabel : pickLabel}
        </label>
      ))}
    </div>
  );
}

function Picks<T extends string | number>({ items, selected, onToggle, label }: { items: T[]; selected: T[]; onToggle: (v: T) => void; label: (v: T) => string }) {
  return (
    <div className="mb-[15px] grid grid-cols-4 gap-[7px]">
      {items.map(item => (
        <label key={item} className="flex cursor-pointer items-center gap-[5px] rounded-[9px] border border-line p-2 text-xs">
          <input type="checkbox" className="accent-brand" checked={selected.includes(item)} onChange={() => onToggle(item)} />
          {label(item)}
        </label>
      ))}
    </div>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

export function CopyScheduleDialog({ onClose, initialDay, initialGroup }: Props) {
  const [dayMode, setDayMode] = useState<Mode>('all');
  const [groupMode, setGroupMode] = useState<Mode>('all');
  const [days, setDays] = useState<Weekday[]>([initialDay]);
  const [groups, setGroups] = useState<number[]>(initialGroup ? [Number(initialGroup)] : []);
  const info = getWeekInfo();

  const copy = async () => {
    if (groupMode === 'selected' && !groups.length) return toast('اختار مجموعة واحدة على الأقل.');
    if (dayMode === 'selected' && !days.length) return toast('اختار يومًا واحدًا على الأقل.');
    const text = buildScheduleText(
      groupMode === 'selected' ? [...groups].sort((a, b) => a - b) : null,
      dayMode === 'selected' ? DAY_KEYS.filter(d => days.includes(d)) : null,
      info,
    );
    if (await copyText(text)) {
      onClose();
      toast('تم نسخ الجدول، تقدر تلصقه في أي مكان.');
    } else {
      toast('تعذر النسخ تلقائيًا. جرّب فتح الموقع في المتصفح والسماح بالنسخ.');
    }
  };

  return (
    <Dialog open onClose={onClose} title="نسخ الجدول كنص" className="w-[min(480px,100%)] p-5">
      <p className="-mt-3 mb-[15px] text-xs leading-[1.6] text-muted">سيُنسخ الجدول لأسبوع {info.section}. حدد الأيام والمجموعات التي تريد تضمينها.</p>
      <strong className="mb-[7px] mt-3 block text-xs">الأيام</strong>
      <ModeToggle name="copyDayMode" value={dayMode} onChange={setDayMode} allLabel="كل الأيام" pickLabel="اختيار أيام" />
      {dayMode === 'selected' && <Picks items={DAY_KEYS} selected={days} onToggle={d => setDays(toggle(days, d))} label={d => DAY_NAMES[d]} />}
      <strong className="mb-[7px] mt-3 block text-xs">المجموعات</strong>
      <ModeToggle name="copyMode" value={groupMode} onChange={setGroupMode} allLabel="كل المجموعات" pickLabel="اختيار مجموعات" />
      {groupMode === 'selected' && <Picks items={GROUPS} selected={groups} onToggle={g => setGroups(toggle(groups, g))} label={g => `المجموعة ${g}`} />}
      <div className="flex justify-end gap-2">
        <Button size="sm" className="text-xs" onClick={onClose}>
          إلغاء
        </Button>
        <Button size="sm" variant="primary" className="text-xs" onClick={() => void copy()}>
          نسخ النص
        </Button>
      </div>
    </Dialog>
  );
}
