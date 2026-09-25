import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { ConfirmDialog, Toast } from '@/components/ui/Feedback';
import { bootstrapSession } from '@/features/auth/authFlow';
import { startTabSync } from '@/features/sync/tabSync';
import { patchAuth } from '@/stores/authStore';
import { router } from '@/routes/router';
import { ROUTES } from '@/routes/paths';

let booted = false;

export function App() {
  useEffect(() => {
    // The standalone timetable needs neither data nor a session.
    if (booted || window.location.pathname === ROUTES.standaloneTimetable) return;
    booted = true;
    startTabSync();
    bootstrapSession().catch(err => {
      console.error(err);
      patchAuth({ status: 'anonymous', configLoaded: true, notice: 'service_unavailable' });
    });
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
      <ConfirmDialog />
    </>
  );
}
