import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/**
 * Round completion checkbox (a real checkbox for keyboard and screen readers). Ticking it
 * pops the check mark in; the row decides how to show the completed state.
 */
export function CompleteToggle({ checked, onChange, label, size = 'md', className }: { checked: boolean; onChange: () => void; label: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', size === 'sm' ? 'size-5' : 'size-6', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className={cn(
          'peer size-full cursor-pointer appearance-none rounded-full border-[1.5px] transition-colors duration-200',
          checked ? 'border-brand bg-brand' : 'border-[#b8c4bd] bg-white hover:border-brand',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        )}
      />
      {checked && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-white motion-safe:animate-check">
          <Icon name="check" size={size === 'sm' ? 12 : 14} className="stroke-[3]" />
        </span>
      )}
    </span>
  );
}
