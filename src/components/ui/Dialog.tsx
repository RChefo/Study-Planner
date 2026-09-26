import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Layer above other overlays (confirm dialog). */
  elevated?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: labelled, Escape/backdrop close, focus moved in, trapped while open,
 * and restored to the trigger on close. Page scroll is locked underneath.
 */
export function Dialog({ open, onClose, title, description, children, className, elevated }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(`${FOCUSABLE}:not([data-dialog-close])`);
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const [firstItem, lastItem] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className={cn('fixed inset-0 flex items-end justify-center bg-[#0f1f1a66] p-0 backdrop-blur-[2px] sm:items-center sm:p-4', elevated ? 'z-[55]' : 'z-50')}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'max-h-[92dvh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-[0_24px_64px_-12px_#0f1f1a55] motion-safe:animate-fade-up sm:w-[min(520px,100%)] sm:rounded-2xl sm:p-6',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="m-0 flex items-center gap-1.5 text-[17px] font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="m-0 mt-1 text-[13px] leading-relaxed text-subtle">
                {description}
              </p>
            )}
          </div>
          <button type="button" data-dialog-close onClick={onClose} aria-label="إغلاق" className="-me-1.5 -mt-1 rounded-lg p-1.5 text-subtle transition-colors hover:bg-ink/5 hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-row-reverse flex-wrap justify-start gap-2">{children}</div>;
}
