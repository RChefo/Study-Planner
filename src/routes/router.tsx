import { Navigate, createBrowserRouter } from 'react-router';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { CommitmentsPage } from '@/pages/CommitmentsPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { StudyLogPage } from '@/pages/StudyLogPage';
import { StandaloneTimetablePage, TimetablePage } from '@/pages/TimetablePage';
import { RequireSession } from './RequireSession';
import { LEGACY_REDIRECTS, ROUTES } from './paths';

export const router = createBrowserRouter([
  // Public
  { path: ROUTES.home, element: <LandingPage /> },
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.authCallback, element: <AuthCallbackPage /> },
  { path: ROUTES.standaloneTimetable, element: <StandaloneTimetablePage /> },

  // Dashboard (signed in, or "continue without an account")
  {
    path: ROUTES.app,
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.courses} replace /> },
      { path: ROUTES.courses, element: <CoursesPage /> },
      { path: ROUTES.timetable, element: <TimetablePage /> },
      { path: ROUTES.commitments, element: <CommitmentsPage /> },
      { path: ROUTES.studyLog, element: <StudyLogPage /> },
      { path: '*', element: <Navigate to={ROUTES.courses} replace /> },
    ],
  },

  // Old bookmarks from before the dashboard moved under /app
  ...LEGACY_REDIRECTS.map(([from, to]) => ({ path: from, element: <Navigate to={to} replace /> })),
  { path: '*', element: <Navigate to={ROUTES.home} replace /> },
]);
