import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary';
type Size = 'md' | 'sm';

const base = 'inline-flex items-center justify-center gap-1 rounded-[11px] border text-sm hover:brightness-[.97] disabled:opacity-60';
const variants: Record<Variant, string> = {
  default: 'border-line bg-white text-ink',
  primary: 'border-brand bg-brand text-white',
};
const sizes: Record<Size, string> = { md: 'px-[15px] py-[10px]', sm: 'px-[11px] py-[6px]' };

function buttonClass(variant: Variant = 'default', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ className, size, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { size?: Size }) {
  return <a className={buttonClass('default', size, cn('no-underline', className))} {...props} />;
}

/** Bordered compact action button (`.icon-btn`); `accent` = the green "start" style. */
export function IconButton({ accent, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center gap-1 rounded-[9px] border px-[10px] py-[7px] text-[13px]',
        accent ? 'border-[#d6e8dc] bg-brand-soft text-brand' : 'border-line bg-white text-[#53645f]',
        className,
      )}
      {...props}
    />
  );
}

/** Borderless text button (`.mini-btn`). */
export function MiniButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn('inline-flex items-center gap-1 border-0 bg-transparent px-[5px] py-[2px] text-[13px] text-muted', className)}
      {...props}
    />
  );
}
