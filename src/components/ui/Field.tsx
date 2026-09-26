import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition-colors placeholder:text-[#9aa6a1] hover:border-[#cfd9d2] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 aria-invalid:border-[#d9826f] aria-invalid:ring-[#d9826f]/15';

interface FieldRenderProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface FieldProps {
  label: ReactNode;
  full?: boolean;
  hint?: ReactNode;
  /** Inline validation message; marks the control invalid and describes it. */
  error?: string | null;
  children: (props: FieldRenderProps) => ReactNode;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, full, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', full && 'col-span-full')}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <p id={errorId} className="m-0 text-xs text-[#a23b24]">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="m-0 text-xs leading-relaxed text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'min-h-20 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'pe-8', className)} {...props} />;
}
