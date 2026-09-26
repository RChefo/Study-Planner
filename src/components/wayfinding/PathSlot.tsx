import { cn } from '@/lib/cn';
import { usePathSlot } from './pathSlotContext';

/** Marks the spot under a page title where the study path appears (renders nothing outside the app shell). */
export function PathSlot({ className }: { className?: string }) {
  const api = usePathSlot();
  if (!api) return null;
  return (
    <div
      // Desktop only: on phones the path lives in the journey footer instead.
      className={cn('min-w-0 max-lg:hidden', className)}
      ref={node => {
        if (!node) return;
        api.register(node);
        return () => api.unregister(node);
      }}
    />
  );
}
