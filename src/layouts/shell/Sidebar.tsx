import { NavLink } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { NAV_ITEMS, ROUTES } from '@/routes/paths';
import { useTimerStore } from '@/stores/timerStore';
import { cn } from '@/lib/cn';
import { SyncIndicator } from './SyncIndicator';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void;
  /** Rendered inside the mobile drawer (never collapsed, no collapse button). */
  inDrawer?: boolean;
}

/**
 * Primary navigation. Collapsed: icons only, with a tooltip that appears on hover AND
 * keyboard focus (the label is also the link's accessible name, so nothing is hover-only).
 */
export function Sidebar({ collapsed, onToggleCollapsed, onNavigate, inDrawer }: SidebarProps) {
  const timerActive = useTimerStore(s => s.timer.active);
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'px-4')}>
        <NavLink to={ROUTES.app} end onClick={onNavigate} className="rounded-lg no-underline" aria-label="Study Planner — الرئيسية">
          <BrandLogo size={32} withName={!collapsed} nameClassName="text-[15px]" priority />
        </NavLink>
      </div>

      <nav aria-label="الأقسام" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {NAV_ITEMS.map(item => (
            <li key={item.to} className="group/nav relative">
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                aria-label={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-9 items-center gap-3 rounded-lg text-[14px] no-underline transition-colors',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    isActive ? 'bg-mint font-semibold text-brand-deep' : 'text-subtle hover:bg-ink/[0.04] hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-brand" />}
                    <Icon name={item.icon} size={18} className={isActive ? 'text-brand' : undefined} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {item.to === ROUTES.timer && timerActive && (
                      <span aria-hidden="true" className={cn('size-2 rounded-full bg-brand-bright motion-safe:animate-pulse', collapsed ? 'absolute end-2 top-2' : 'ms-auto')} />
                    )}
                  </>
                )}
              </NavLink>
              {collapsed && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-focus-within/nav:opacity-100 group-hover/nav:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('border-t border-line p-2', collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center justify-between gap-2')}>
        <SyncIndicator compact={collapsed} />
        {!inDrawer && onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
            aria-expanded={!collapsed}
            className="grid size-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <Icon name="panel" size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
