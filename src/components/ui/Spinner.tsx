import { cn } from '@/lib/cn';

/** Decorative loading indicator; pair it with visible or sr-only text. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none', className)}
    />
  );
}
