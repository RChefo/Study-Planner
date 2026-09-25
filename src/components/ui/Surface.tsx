import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Small shared building blocks mirroring the original `.panel`, `.stat`, `.empty`, `.hint`, `.badge`. */

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-card p-[19px] shadow-card', className)} {...props} />;
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-[15px] mt-0 text-base font-bold">{children}</h3>;
}

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  compact?: boolean;
}

export function StatCard({ label, value, note, compact, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-card shadow-card',
        compact ? 'rounded-[14px] px-[17px] py-[13px] max-md:p-[11px]' : 'px-[18px] py-[17px]',
        className,
      )}
      {...props}
    >
      <div className="text-[13px] text-muted">{label}</div>
      <strong className={cn('mt-[5px] block font-bold', compact ? 'text-[28px] text-brand max-md:text-[23px]' : 'text-[25px]')}>{value}</strong>
      {note && <small className="text-xs font-normal text-muted">{note}</small>}
    </div>
  );
}

/** Small unit text inside a stat value, e.g. "دقيقة". */
export function StatUnit({ children }: { children: ReactNode }) {
  return <small className="text-xs font-normal text-muted">{children}</small>;
}

export function StatsRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-[22px] grid grid-cols-3 gap-[13px] max-md:grid-cols-2', className)} {...props} />;
}

export function EmptyState({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[15px] border border-dashed border-[#cfd9d2] bg-white p-[34px] text-center text-muted', className)} {...props} />;
}

export function Hint({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-xs leading-[1.7] text-muted', className)} {...props} />;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="mr-[5px] inline-flex rounded-[20px] bg-mint px-[9px] py-1 text-[11px] text-brand">{children}</span>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="my-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="m-0 text-lg font-bold">{title}</h2>
        {description && <p className="mb-0 mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** List row used by commitments and the study log (`.commit`). */
export function ListRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-between gap-2 rounded-[10px] bg-stripe px-3 py-[10px] text-[13px]', className)} {...props} />;
}
