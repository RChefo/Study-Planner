import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass = 'w-full rounded-[9px] border border-line bg-white p-[10px] text-ink';

interface FieldProps {
  label: ReactNode;
  full?: boolean;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}

/** Label + control column (`.field`). `full` spans both columns of a FieldGrid. */
export function Field({ label, full, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', full && 'col-span-full max-md:col-auto')}>
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      {children(id)}
      {hint && <small className="text-xs leading-[1.7] text-muted">{hint}</small>}
    </div>
  );
}

export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 max-md:grid-cols-1', className)}>{children}</div>;
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, className)} {...props} />;
}
