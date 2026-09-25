import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { DashboardStats, Hero } from '@/components/layout/DashboardHeader';
import { TabNav } from '@/components/layout/TabNav';
import { TimerDock, TimerMini } from '@/features/timer/TimerDock';
import { resumeRunningTimer } from '@/features/timer/timerController';
import { useTimerEngine } from '@/features/timer/useTimerEngine';
import { useDocumentLocale } from '@/i18n/locale';

/** Main shell: header, greeting, stats, tab navigation, and the timer overlay. */
export function AppLayout() {
  // The dashboard is Arabic-only, whatever language the public pages were viewed in.
  useDocumentLocale('ar');
  useTimerEngine();
  useEffect(() => {
    resumeRunningTimer();
  }, []);

  return (
    <>
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
