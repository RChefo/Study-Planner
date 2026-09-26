import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

type Tone = 'light' | 'dark';

/**
 * The landing page's primary call to action: a pill whose arrow sits in its own disc
 * and slides toward the reading direction on hover. `light` is for dark backgrounds.
 */
export function PathCta({ tone = 'light', className, children, ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return (
    <Link
      className={cn(
        'group inline-flex h-14 items-center justify-between gap-4 rounded-full ps-7 pe-2 text-base font-semibold no-underline transition-[background-color,box-shadow] duration-300',
        tone === 'light'
          ? 'bg-dawn text-brand-night shadow-[0_0_0_1px_#ffffff30,0_18px_40px_-18px_#000000aa] hover:bg-white focus-visible:outline-dawn'
          : 'bg-brand-night text-dawn shadow-[0_18px_40px_-20px_#0c2f26cc] hover:bg-brand-deep',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-10 place-items-center overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-105',
          tone === 'light' ? 'bg-brand-night text-dawn' : 'bg-dawn text-brand-night',
        )}
      >
        <span className="inline-flex transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
          <Icon name="arrow" size={18} />
        </span>
      </span>
    </Link>
  );
}

/** Secondary action: plain text with an underline that sweeps in on hover/focus. */
export function TextCta({ tone = 'light', className, children, ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return (
    <Link
      className={cn(
        'group relative inline-flex h-14 items-center px-1 text-base font-semibold no-underline',
        tone === 'light' ? 'text-dawn focus-visible:outline-dawn' : 'text-brand-night',
        className,
      )}
      {...props}
    >
      <span className="relative pb-1">
        {children}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-current opacity-35" />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100 rtl:origin-right"
        />
      </span>
    </Link>
  );
}
