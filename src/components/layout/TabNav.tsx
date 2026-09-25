import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { NAV_TABS } from '@/routes/paths';

export function TabNav() {
  return (
    <nav className="mb-[18px] flex gap-[7px] overflow-x-auto border-b border-line" aria-label="الأقسام">
      {NAV_TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap border-b-2 px-[17px] py-3 no-underline max-md:px-3 max-md:py-[10px]',
              isActive ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
