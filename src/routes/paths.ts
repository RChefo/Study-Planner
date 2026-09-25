/** Central route table. The original tabs (courses/timetable/commitments/studylog) are now URLs. */
export const ROUTES = {
  courses: '/courses',
  timetable: '/timetable',
  commitments: '/commitments',
  studyLog: '/study-log',
  /** Standalone timetable page (was /university-timetable.html). */
  standaloneTimetable: '/university-timetable',
} as const;

export const NAV_TABS = [
  { to: ROUTES.courses, label: 'المواد' },
  { to: ROUTES.timetable, label: 'الجدول الدراسي' },
  { to: ROUTES.commitments, label: 'التزاماتي' },
  { to: ROUTES.studyLog, label: 'سجل المذاكرة' },
] as const;
