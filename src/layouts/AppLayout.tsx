import { Outlet } from 'react-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { DashboardStats, Hero } from '@/components/layout/DashboardHeader';
import { TabNav } from '@/components/layout/TabNav';
import { AuthGate } from '@/features/auth/AuthGate';
import { TimerDock, TimerMini } from '@/features/timer/TimerDock';
import { useTimerEngine } from '@/features/timer/useTimerEngine';

/** Main shell: header, greeting, stats, tab navigation, and global overlays. */
export function AppLayout() {
  useTimerEngine();
  return (
    <>
      <AuthGate />
      <div className="mx-auto max-w-[1180px] px-6 pb-[60px] pt-[30px] max-md:px-[13px] max-md:pb-10 max-md:pt-[18px]">
        <AppHeader />
        <Hero />
        <DashboardStats />
        <TabNav />
        <main>
          <Outlet />
        </main>
      </div>
      <TimerDock />
      <TimerMini />
    </>
  );
}
