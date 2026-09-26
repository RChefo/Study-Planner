import type { ButtonHTMLAttributes, ComponentProps } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { buttonStyles, type Size, type Variant } from './buttonStyles';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets aria-busy and blocks clicks. */
  loading?: boolean;
}

export function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonStyles(variant, size, className)} disabled={disabled} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

/** Router link styled as a button. */
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonStyles(variant, size, cn('no-underline', className))} {...props} />;
}

/** Bordered compact action button (legacy `.icon-btn`); `accent` = green "start" style. */
export function IconButton({ accent, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors',
        accent ? 'border-[#d6e8dc] bg-brand-soft text-brand hover:bg-mint' : 'border-line bg-white text-[#53645f] hover:bg-stripe',
        className,
      )}
      {...props}
    />
  );
}

/** Borderless text button. */
export function MiniButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn('inline-flex items-center gap-1 rounded-md border-0 bg-transparent px-1.5 py-1 text-[13px] text-subtle transition-colors hover:bg-ink/5 hover:text-ink', className)}
      {...props}
    />
  );
}
