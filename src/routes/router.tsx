import { Navigate, createBrowserRouter } from 'react-router';
import { LandingPage } from '@/pages/LandingPage';
import { RequireSession } from './RequireSession';
import { RouteError } from './RouteError';
import { LEGACY_REDIRECTS, ROUTES } from './paths';

/** Page titles shown in the top bar and the document title. */
export interface RouteHandle {
  title: string;
}

/**
 * Route-level code splitting: the landing page is eager (it's the entry point); sign-in,
 * the dashboard shell and every dashboard page load on demand.
 */
type LazyPage = () => Promise<{ Component: React.ComponentType }>;
const page = (title: string, lazy: LazyPage): { handle: RouteHandle; lazy: LazyPage } => ({ handle: { title }, lazy });

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <LandingPage />, errorElement: <RouteError /> },
  { path: ROUTES.login, lazy: async () => ({ Component: (await import('@/pages/LoginPage')).LoginPage }), errorElement: <RouteError /> },
  { path: ROUTES.authCallback, lazy: async () => ({ Component: (await import('@/pages/AuthCallbackPage')).AuthCallbackPage }), errorElement: <RouteError /> },
  {
    path: ROUTES.standaloneTimetable,
    lazy: async () => ({ Component: (await import('@/pages/TimetablePage')).StandaloneTimetablePage }),
    errorElement: <RouteError />,
  },
  {
    path: ROUTES.app,
    lazy: async () => {
      const { AppShell } = await import('@/layouts/AppShell');
      return {
        Component: () => (
          <RequireSession>
            <AppShell />
          </RequireSession>
        ),
      };
    },
    errorElement: <RouteError />,
    children: [
      // Errors inside a page keep the sidebar/top bar and offer a retry.
      {
        errorElement: <RouteError inline />,
        children: [
          { index: true, ...page('الرئيسية', async () => ({ Component: (await import('@/pages/DashboardPage')).DashboardPage })) },
          { path: ROUTES.courses, ...page('المواد', async () => ({ Component: (await import('@/pages/CoursesPage')).CoursesPage })) },
          { path: `${ROUTES.courses}/:courseId`, ...page('المادة', async () => ({ Component: (await import('@/pages/CourseDetailPage')).CourseDetailPage })) },
          { path: ROUTES.timetable, ...page('الجدول', async () => ({ Component: (await import('@/pages/TimetablePage')).TimetablePage })) },
          { path: ROUTES.commitments, ...page('الالتزامات', async () => ({ Component: (await import('@/pages/CommitmentsPage')).CommitmentsPage })) },
          { path: ROUTES.studyLog, ...page('سجل المذاكرة', async () => ({ Component: (await import('@/pages/StudyLogPage')).StudyLogPage })) },
          { path: ROUTES.timer, ...page('وضع التركيز', async () => ({ Component: (await import('@/pages/TimerPage')).TimerPage })) },
          { path: ROUTES.stats, ...page('الإحصائيات', async () => ({ Component: (await import('@/pages/StatsPage')).StatsPage })) },
          { path: ROUTES.settings, ...page('الإعدادات', async () => ({ Component: (await import('@/pages/SettingsPage')).SettingsPage })) },
          { path: '*', element: <Navigate to={ROUTES.app} replace /> },
        ],
      },
    ],
  },

  // Old bookmarks from before the dashboard moved under /app
  ...LEGACY_REDIRECTS.map(([from, to]) => ({ path: from, element: <Navigate to={to} replace /> })),
  { path: '*', element: <Navigate to={ROUTES.home} replace /> },
]);
