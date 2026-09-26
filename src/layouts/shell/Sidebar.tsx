import { NavLink } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { NAV_ITEMS, ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { SyncIndicator } from './SyncIndicator';

/**
 * Desktop navigation: a light rail on a slightly deeper paper. The active page sits on a
 * white pill; collapsed, labels become tooltips that also appear on keyboard focus (and
 * remain the links' accessible names).
 */
export function Sidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'px-5')}>
        <NavLink to={ROUTES.app} end className="rounded-lg no-underline" aria-label="Study Planner — الرئيسية">
          <BrandLogo size={30} withName={!collapsed} nameClassName="text-[15px] text-brand-night" priority />
        </NavLink>
      </div>

      <nav aria-label="الأقسام" className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2.5' : 'px-3')}>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {NAV_ITEMS.map(item => (
            <li key={item.to} className="group/nav relative">
              <NavLink
                to={item.to}
                end={item.end}
                aria-label={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-xl text-[14px] no-underline transition-[background-color,color,box-shadow] duration-200',
                    collapsed ? 'justify-center' : 'px-3',
                    isActive ? 'bg-white font-semibold text-brand-night shadow-[0_1px_2px_#0d2a2012,0_0_0_1px_#0d2a200a]' : 'text-subtle hover:bg-white/55 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={18} className={isActive ? 'text-brand' : undefined} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
              {collapsed && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-brand-night px-2 py-1 text-xs text-dawn opacity-0 shadow-lg transition-opacity group-focus-within/nav:opacity-100 group-hover/nav:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('flex shrink-0 items-center gap-1 border-t border-brand-night/[0.07] p-2.5', collapsed ? 'flex-col' : 'justify-between')}>
        <SyncIndicator compact={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
          aria-expanded={!collapsed}
          className="grid size-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-white/70 hover:text-ink"
        >
          <Icon name="panel" size={17} />
        </button>
      </div>
    </div>
  );
}
