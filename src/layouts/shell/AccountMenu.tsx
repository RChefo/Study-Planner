import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { signOut, signOutEverywhere } from '@/features/auth/authFlow';
import { confirmAction } from '@/stores/uiStore';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/buttonStyles';
import { ROUTES, loginPath } from '@/routes/paths';
import { cn } from '@/lib/cn';

function Avatar({ name, picture }: { name: string; picture?: string }) {
  if (picture) return <img src={picture} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full object-cover" />;
  return (
    <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">
      {(name.trim()[0] ?? '؟').toUpperCase()}
    </span>
  );
}

/** Account button + menu (keyboard: Enter/Space opens, arrows move, Escape closes). */
export function AccountMenu() {
  const user = useAuthStore(s => s.user);
  const local = useAuthStore(s => s.status === 'local');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Tab') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (local && !user) {
    return (
      <Link to={loginPath({ next: ROUTES.app })} aria-label="تسجيل الدخول لمزامنة بياناتك" className={buttonStyles('secondary', 'sm', 'no-underline max-sm:w-8 max-sm:px-0')}>
        <Icon name="user" size={15} /> <span className="max-sm:hidden">تسجيل الدخول</span>
      </Link>
    );
  }

  const name = user?.name || user?.email || 'حسابي';
  const itemClass = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm text-ink no-underline outline-none hover:bg-stripe focus-visible:bg-stripe';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(o => !o)}
        className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-ink/5"
      >
        <Avatar name={name} picture={user?.picture} />
        <span className="max-w-32 truncate text-[13px] font-medium text-ink max-md:hidden">{name}</span>
        <span className="sr-only">قائمة الحساب</span>
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="الحساب" className="absolute end-0 top-11 z-40 w-64 rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_#0f1f1a40] motion-safe:animate-fade-up">
          <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
            <p className="m-0 truncate text-sm font-semibold text-ink">{name}</p>
            {user?.email && (
              <p className="m-0 truncate text-xs text-subtle" dir="ltr">
                {user.email}
              </p>
            )}
            <p className="m-0 mt-1 text-xs text-subtle">عبر {user?.provider === 'discord' ? 'Discord' : 'Google'}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" to={ROUTES.settings} className={itemClass} onClick={() => setOpen(false)}>
              <Icon name="settings" size={16} className="text-subtle" /> الإعدادات
            </Link>
            <button
              role="menuitem"
              type="button"
              className={itemClass}
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate(ROUTES.login, { replace: true });
              }}
            >
              <Icon name="logout" size={16} className="text-subtle" /> تسجيل الخروج
            </button>
            <button
              role="menuitem"
              type="button"
              className={cn(itemClass, 'text-[#a23b24]')}
              onClick={async () => {
                setOpen(false);
                const ok = await confirmAction('سيتم تسجيل خروجك من هذا الجهاز وكل الأجهزة الأخرى المسجّلة في حسابك.', {
                  title: 'تسجيل الخروج من كل الأجهزة',
                  confirmLabel: 'تسجيل الخروج من الكل',
                  danger: true,
                });
                if (!ok) return;
                await signOutEverywhere();
                navigate(ROUTES.login, { replace: true });
              }}
            >
              <Icon name="shield" size={16} /> الخروج من كل الأجهزة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
