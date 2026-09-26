import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  /** Accessible name of the trigger ("خيارات Java"). */
  label: string;
  items: MenuItem[];
  /** Custom trigger content; defaults to a "more" icon button. */
  trigger?: ReactNode;
  triggerClassName?: string;
  className?: string;
}

/**
 * Overflow menu (menu button pattern): Enter/Space/click opens, arrows move, Escape or Tab
 * closes and returns focus. Opens upward when there isn't room below.
 */
export function Menu({ label, items, trigger, triggerClassName, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const list = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
    list()[0]?.focus();
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      const items = list();
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length]?.focus();
      } else if (e.key === 'Tab') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    setUp(!!rect && rect.bottom + 48 * items.length + 24 > window.innerHeight && rect.top > 48 * items.length + 24);
    setOpen(o => !o);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        className={cn('grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-ink/5 hover:text-ink', triggerClassName)}
      >
        {trigger ?? <Icon name="more" size={18} />}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute end-0 z-40 min-w-44 rounded-xl border border-line bg-white p-1 shadow-[0_16px_40px_-14px_#0f1f1a45] motion-safe:animate-enter',
            up ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm outline-none transition-colors hover:bg-stripe focus-visible:bg-stripe disabled:opacity-50',
                item.danger ? 'text-[#94401a]' : 'text-ink',
              )}
            >
              {item.icon && <Icon name={item.icon} size={16} className={item.danger ? undefined : 'text-subtle'} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
