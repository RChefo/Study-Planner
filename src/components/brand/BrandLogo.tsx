import logoUrl from '@/assets/branding/study-planner-logo.webp';
import { cn } from '@/lib/cn';

/** Intrinsic ratio of the official logo (480×438 web copy of the 1313×1198 master). */
const RATIO = 438 / 480;

interface BrandLogoProps {
  /** Rendered width in px; height follows the logo's aspect ratio. */
  size?: number;
  /** Show the "Study Planner" wordmark next to the mark. */
  withName?: boolean;
  className?: string;
  nameClassName?: string;
  /** Eager-load when the logo is above the fold. */
  priority?: boolean;
}

/** The official Study Planner logo — used as-is, never redrawn. */
export function BrandLogo({ size = 40, withName, className, nameClassName, priority }: BrandLogoProps) {
  const img = (
    <img
      src={logoUrl}
      width={size}
      height={Math.round(size * RATIO)}
      alt={withName ? '' : 'Study Planner'}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="h-auto shrink-0 select-none"
      draggable={false}
    />
  );
  if (!withName) return <span className={cn('inline-flex', className)}>{img}</span>;
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {img}
      {/* dir=ltr keeps the Latin product name intact inside Arabic text. */}
      <span dir="ltr" className={cn('text-lg font-bold tracking-tight text-ink', nameClassName)}>
        Study Planner
      </span>
    </span>
  );
}
