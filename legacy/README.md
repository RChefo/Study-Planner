# Legacy frontend (pre-React)

These are the original single-file pages that `server.js` served from `public/`
before the migration to React + Vite + TypeScript. They are **not** built or served
anymore and are kept only for reference/rollback. Delete this folder once you no
longer need it.

- `index.html` → now `src/` (layouts, pages, features, stores, services)
- `university-timetable.html` → now `src/features/timetable/` (in-app tab `/timetable`
  and standalone page `/university-timetable`)
