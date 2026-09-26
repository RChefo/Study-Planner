import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  className?: string;
}

/** Single-choice pill group (radiogroup): one tab stop, arrow keys move the choice. */
export function Segmented<T extends string | number>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0;
    if (!step) return;
    e.preventDefault();
    const i = options.findIndex(([v]) => v === value);
    const next = options[(i + step + options.length) % options.length][0];
    onChange(next);
    requestAnimationFrame(() => e.currentTarget?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className={cn('inline-flex max-w-full overflow-x-auto rounded-full bg-[#e9ede6] p-0.5 text-[13px]', className)}>
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(v)}
            className={cn('whitespace-nowrap rounded-full px-3 py-1 transition-[background-color,color,box-shadow] duration-200', on ? 'bg-white font-semibold text-brand-night shadow-[0_1px_2px_#0d2a2014]' : 'text-subtle hover:text-ink')}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
