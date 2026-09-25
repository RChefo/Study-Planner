import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-[0_1px_0_#ffffff26_inset,0_8px_20px_-8px_#286b56aa] hover:bg-brand-deep',
  secondary: 'border border-line bg-white text-ink shadow-[0_1px_2px_#0d2a200d] hover:border-[#cfd9d2] hover:bg-stripe',
  ghost: 'text-subtle hover:bg-ink/5 hover:text-ink',
  inverse: 'bg-white text-brand-deep shadow-[0_8px_24px_-10px_#00000055] hover:bg-mint',
};
const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

function linkButtonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold no-underline transition-colors duration-150',
    variants[variant],
    sizes[size],
    className,
  );
}

/** Router link styled as a button (for navigation actions like "Get started"). */
export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={linkButtonClass(variant, size, className)} {...props} />;
}
