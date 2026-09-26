import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { PathSlot } from '@/components/wayfinding/PathSlot';

/*
 * App design primitives. The app is mostly flat paper with hairline dividers; `Card` is a
 * quiet sheet used only where content needs a boundary (grids, forms, grouped settings).
 */

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('min-w-0 rounded-2xl border border-line bg-white', className)} {...props} />;
}

/** Page title in the editorial display face, with an optional eyebrow and end-side actions. */
export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header data-tour="page-header" className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-10', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="m-0 mb-1 text-[13px] font-medium text-brand">{eyebrow}</p>}
        <h1 className="font-display m-0 text-[2.1rem] font-normal leading-[1.3] text-brand-night sm:text-[2.6rem]">{title}</h1>
        {description && <p className="m-0 mt-1.5 max-w-2xl text-[15px] leading-relaxed text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {/* the study path sits under the title (inside the app shell only) */}
      <PathSlot className="basis-full" />
    </header>
  );
}

/** Section title row: small, confident label + optional count and end-side action. */
export function SectionHeader({ id, title, count, description, action, className }: { id?: string; title: ReactNode; count?: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="m-0 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
          {title}
          {count !== undefined && <span className="text-[13px] font-normal tabular-nums text-muted">{count}</span>}
        </h2>
        {description && <p className="m-0 mt-0.5 text-[13px] text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Quiet text link used as a section action ("عرض الكل"). */
export const sectionLinkClass = 'inline-flex items-center gap-1 text-[13px] font-medium text-brand no-underline hover:underline';

/** Accessible progress bar that grows in on mount (static when motion is reduced). */
export function Progress({ value, label, className, tone = 'brand', size = 'md' }: { value: number; label: string; className?: string; tone?: 'brand' | 'accent' | 'light'; size?: 'xs' | 'sm' | 'md' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('overflow-hidden rounded-full', tone === 'light' ? 'bg-white/15' : 'bg-[#e3e9e2]', size === 'xs' ? 'h-1' : size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <div
        className={cn(
          'h-full origin-left rounded-full transition-[width] duration-700 ease-out motion-safe:animate-grow rtl:origin-right',
          tone === 'accent' ? 'bg-accent' : tone === 'light' ? 'bg-[#8fd6b3]' : 'bg-brand',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-[#e6ebe5] motion-reduce:animate-none', className)} />;
}

/** Calm empty state: no box, a thin-ring icon, one sentence and at most one action. */
export function EmptyState({ icon = 'folder', title, description, action, className }: { icon?: IconName; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-full border border-brand/20 bg-brand-soft/60 text-brand">
        <Icon name={icon} size={20} />
      </span>
      <p className="m-0 mt-4 text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="m-0 mt-1 max-w-sm text-[13px] leading-relaxed text-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel = 'إعادة المحاولة' }: { title: string; description?: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-[#e9c8b8] bg-[#fbf1ea] text-[#9a4a22]">
        <Icon name="alert" size={20} />
      </span>
      <p className="m-0 mt-4 text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="m-0 mt-1 max-w-sm text-[13px] leading-relaxed text-subtle">{description}</p>}
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <Icon name="refresh" size={15} /> {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Inline figure (label above a large value) for metric bands — not a tile. */
export function Metric({ label, value, note, className }: { label: ReactNode; value: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[13px] text-subtle">{label}</dt>
      <dd className="m-0 mt-1 text-[1.6rem] font-semibold leading-tight tracking-tight text-ink">{value}</dd>
      {note && <dd className="m-0 mt-0.5 truncate text-xs text-subtle">{note}</dd>}
    </div>
  );
}

type ChipTone = 'done' | 'progress' | 'idle' | 'late' | 'soon' | 'info' | 'danger' | 'warning';
const CHIP: Record<ChipTone, string> = {
  done: 'bg-mint text-brand-deep',
  progress: 'bg-[#fbf0dc] text-[#7c4e0e]',
  idle: 'bg-[#eef1ec] text-subtle',
  // Overdue: warm terracotta, clear without shouting red.
  late: 'bg-[#f8e8dc] text-[#94401a]',
  danger: 'bg-[#f8e8dc] text-[#94401a]',
  soon: 'bg-[#fbf0dc] text-[#7c4e0e]',
  warning: 'bg-[#fbf0dc] text-[#7c4e0e]',
  info: 'bg-[#e8f0f6] text-[#2d5877]',
};

/** Status label: icon + text, never colour alone. */
export function StatusChip({ tone, icon, children, className }: { tone: ChipTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', CHIP[tone], className)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}
