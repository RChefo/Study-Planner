import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { ConfirmDialog, Toast } from '@/components/ui/Feedback';
import { initCloudApp } from '@/features/auth/authFlow';
import { patchAuth } from '@/stores/authStore';
import { router } from '@/routes/router';
import { ROUTES } from '@/routes/paths';

let booted = false;

export function App() {
  useEffect(() => {
    // The standalone timetable needs neither data nor sign-in.
    if (booted || window.location.pathname === ROUTES.standaloneTimetable) return;
    booted = true;
    initCloudApp().catch(err => {
      console.error(err);
      patchAuth({ message: 'تعذر بدء الموقع. تقدر تستخدم البيانات المحلية من الزر بالأسفل.' });
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
