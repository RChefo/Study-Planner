import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  /** Layer above the auth gate (used by the confirm dialog). */
  elevated?: boolean;
}

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';

/** Accessible modal: Escape and backdrop click close it; focus moves in and is restored. */
export function Dialog({ open, onClose, title, children, className, elevated }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className={cn('fixed inset-0 flex items-center justify-center bg-[#15231f75] p-[15px]', elevated ? 'z-50' : 'z-[5]')}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('max-h-[90vh] w-[min(520px,100%)] overflow-auto rounded-[18px] bg-white p-[23px]', className)}
      >
        <h2 id={titleId} className="mb-[17px] mt-0 flex items-center gap-1.5 text-[19px] font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-[18px] flex justify-between">{children}</div>;
}
