import { cn } from '@/lib/cn';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'default';
export type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 aria-busy:pointer-events-none';
const variants: Record<Variant, string> = {
  primary: 'border-brand bg-brand text-white shadow-[0_1px_0_#ffffff22_inset] hover:border-brand-deep hover:bg-brand-deep',
  secondary: 'border-line bg-white text-ink hover:bg-stripe',
  default: 'border-line bg-white text-ink hover:bg-stripe',
  ghost: 'border-transparent bg-transparent text-subtle hover:bg-ink/5 hover:text-ink',
  danger: 'border-[#e8c9c2] bg-white text-[#a23b24] hover:bg-[#fdf1ee]',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-[15px]',
  icon: 'size-9 p-0 text-sm',
};

export function buttonStyles(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
