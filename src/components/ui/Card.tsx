import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

/** Base surface for app content. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('min-w-0 rounded-xl border border-line bg-white', className)} {...props} />;
}

/** Card title row with optional action on the end side. */
export function CardHeader({ title, description, action, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
      <div className="min-w-0">
        <h2 id={id} className="m-0 text-[15px] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="m-0 mt-0.5 text-[13px] text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="m-0 mt-1 text-sm text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Accessible progress bar. `tone` switches to the accent for "attention" states. */
export function Progress({ value, label, className, tone = 'brand', size = 'md' }: { value: number; label: string; className?: string; tone?: 'brand' | 'accent'; size?: 'sm' | 'md' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('overflow-hidden rounded-full bg-[#e9eee9]', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', tone === 'accent' ? 'bg-accent' : 'bg-brand-bright')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-[#e8ece7] motion-reduce:animate-none', className)} />;
}

export function EmptyState({ icon = 'folder', title, description, action, className }: { icon?: IconName; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-mint text-brand">
        <Icon name={icon} size={20} />
      </span>
      <p className="m-0 mt-3 text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="m-0 mt-1 max-w-sm text-[13px] leading-relaxed text-subtle">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel = 'إعادة المحاولة' }: { title: string; description?: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-[#fdf1ee] text-[#a23b24]">
        <Icon name="alert" size={20} />
      </span>
      <p className="m-0 mt-3 text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="m-0 mt-1 max-w-sm text-[13px] leading-relaxed text-subtle">{description}</p>}
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          <Icon name="refresh" size={15} /> {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Headline number tile (label · value · optional note). Proportional figures for large values. */
export function StatTile({ label, value, note, icon, className }: { label: string; value: ReactNode; note?: ReactNode; icon?: IconName; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-line bg-white px-4 py-3.5', className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-subtle">
        {icon && <Icon name={icon} size={15} className="text-brand" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold leading-tight text-ink">{value}</div>
      {note && <div className="mt-0.5 truncate text-xs text-subtle">{note}</div>}
    </div>
  );
}

type ChipTone = 'done' | 'progress' | 'idle' | 'danger' | 'warning' | 'info';
const CHIP: Record<ChipTone, string> = {
  done: 'bg-mint text-brand',
  progress: 'bg-[#fff4e6] text-[#8a4a12]',
  idle: 'bg-[#eef1ee] text-subtle',
  danger: 'bg-[#fdecea] text-[#a23b24]',
  warning: 'bg-[#fff4e6] text-[#8a4a12]',
  info: 'bg-[#eaf1fb] text-[#2b5aa0]',
};

/** Status label: icon + text, never color alone. */
export function StatusChip({ tone, icon, children }: { tone: ChipTone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', CHIP[tone])}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}
