import { Navigate, createBrowserRouter } from 'react-router';
import { AppLayout } from '@/layouts/AppLayout';
import { CoursesPage } from '@/pages/CoursesPage';
import { CommitmentsPage } from '@/pages/CommitmentsPage';
import { StudyLogPage } from '@/pages/StudyLogPage';
import { StandaloneTimetablePage, TimetablePage } from '@/pages/TimetablePage';
import { ROUTES } from './paths';

export const router = createBrowserRouter([
  { path: ROUTES.standaloneTimetable, element: <StandaloneTimetablePage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTES.courses} replace /> },
      { path: ROUTES.courses, element: <CoursesPage /> },
      { path: ROUTES.timetable, element: <TimetablePage /> },
      { path: ROUTES.commitments, element: <CommitmentsPage /> },
      { path: ROUTES.studyLog, element: <StudyLogPage /> },
      { path: '*', element: <Navigate to={ROUTES.courses} replace /> },
    ],
  },
]);
