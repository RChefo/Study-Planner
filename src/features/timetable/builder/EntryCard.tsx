import type { Course, TimetableDisplay, TimetableEntry } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';
import { typeLabel } from '../builder';
import { entryTitle } from './useTimetable';
import { TONES } from './tones';


/** One class or break, as shown in the week grid and the day list. */
export function EntryCard({
  entry,
  courses,
  display,
  conflict,
  onOpen,
  className,
  fill,
}: {
  entry: TimetableEntry;
  courses: Course[];
  display: TimetableDisplay;
  conflict?: boolean;
  onOpen: () => void;
  className?: string;
  /** In the grid the card fills its time slot. */
  fill?: boolean;
}) {
  const title = entryTitle(entry, courses);
  const isBreak = entry.kind === 'break';
  const tone = TONES[entry.color ?? 'default'];
  const compact = display.density === 'compact';
  const meta = [typeLabel(entry.type), display.showGroup ? entry.group : ''].filter(Boolean).join(' · ');
  const label = `${title}، ${entry.start} إلى ${entry.end}${meta ? `، ${meta}` : ''}${display.showRoom && entry.room ? `، ${entry.room}` : ''}${conflict ? '، يتعارض مع حصة أخرى' : ''}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={cn(
        'group relative flex w-full min-w-0 overflow-hidden rounded-xl text-start outline-none transition-[box-shadow,transform] duration-150 hover:shadow-[0_8px_18px_-12px_#0c2f26aa] focus-visible:ring-2 focus-visible:ring-[#c19a4f] motion-safe:active:scale-[0.99]',
        isBreak ? 'border border-dashed border-[#d3c4a3] bg-[repeating-linear-gradient(135deg,#faf6ec_0_6px,#f4eee0_6px_12px)] text-[#6b5a36]' : tone.card,
        fill && 'h-full',
        className,
      )}
    >
      {!isBreak && <span aria-hidden="true" className={cn('w-1 shrink-0', tone.bar)} />}
      <span className={cn('flex min-w-0 flex-1 flex-col', compact ? 'px-2 py-1' : 'px-2.5 py-1.5')}>
        <span className="flex min-w-0 items-center gap-1">
          {conflict && <Icon name="alert" size={12} className="shrink-0 text-[#b56832]" />}
          {isBreak && <Icon name="coffee" size={12} className="shrink-0 opacity-70" />}
          <span lang={langOf(title)} className={cn('truncate font-semibold', compact ? 'text-[12px]' : 'text-[13px]')}>
            {title}
          </span>
        </span>
        <span dir="ltr" className="text-[11px] tabular-nums opacity-70 rtl:text-right">
          {entry.start}–{entry.end}
        </span>
        {!compact && !isBreak && (
          <>
            {meta && <span className="truncate text-[11px] opacity-80">{meta}</span>}
            {display.showRoom && entry.room && (
              <span className="flex min-w-0 items-center gap-1 text-[11px] opacity-80">
                <Icon name="mapPin" size={11} className="shrink-0" />
                <span lang={langOf(entry.room)} className="truncate">
                  {entry.room}
                </span>
              </span>
            )}
            {display.showInstructor && entry.instructor && (
              <span lang={langOf(entry.instructor)} className="truncate text-[11px] opacity-70">
                {entry.instructor}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
}
