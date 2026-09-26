'use strict';

const { z } = require('zod');
const { AppError } = require('./errors');

/**
 * Request schemas. Unknown keys in nested planner data are stripped; request envelopes
 * are strict. Lengths are generous for real use but bounded against abuse.
 */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid id');
const shortId = z.string().min(1).max(64);
const text = max => z.string().max(max);
const bool = z.boolean();

// Attachments inside synced data are always GridFS references, never raw file content.
const cloudFileRef = z.strictObject({
  __cloudFile: objectId,
  sha256: z.string().regex(/^[a-f\d]{64}$/i),
});

const lecture = z.object({
  name: text(300),
  done: bool.optional().default(false),
  pdf: cloudFileRef.optional(),
  pdfName: text(255).optional(),
});

const course = z.object({
  id: shortId,
  name: text(200),
  topics: z.array(lecture).max(1000).optional().default([]),
});

const commitment = z.object({
  id: shortId,
  name: text(300),
  dueDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(''),
  description: text(5000).optional().default(''),
  done: bool.optional(),
  pdf: cloudFileRef.optional(),
  pdfName: text(255).optional(),
});

const epochMs = z.number().finite().min(0).max(8.64e15);

const studyLogEntry = z.object({
  id: shortId,
  subject: text(200),
  topic: text(300),
  startedAt: epochMs,
  endedAt: epochMs,
  duration: z.number().finite().min(0).max(1440),
  completed: bool,
  sessionId: z.string().max(64).nullable().optional().default(null),
});

// Scheduled sessions from an earlier version of the app — kept for data compatibility.
const studySession = z.object({
  id: shortId,
  course: text(64).optional().default(''),
  subject: text(200).optional(),
  topic: text(300).optional().default(''),
  date: text(20).optional().default(''),
  time: text(10).optional().default(''),
  duration: z.number().finite().min(0).max(1440).optional().default(0),
  priority: text(20).optional().default(''),
  study: text(2000).optional().default(''),
  prev: text(300).optional().default(''),
  next: text(300).optional().default(''),
  status: z.enum(['planned', 'inprogress', 'done', 'skipped', 'moved']).optional().default('planned'),
});

const timerSettings = z.object({
  focus: z.number().int().min(1).max(180),
  shortBreak: z.number().int().min(1).max(60),
  longBreak: z.number().int().min(1).max(90),
  cycles: z.number().int().min(2).max(8),
});

const preferences = z.object({
  dailyGoalMinutes: z.number().int().min(0).max(1440).optional(),
  // First-run product tour: completed or skipped (both stop it opening automatically).
  onboarding: z.strictObject({ status: z.enum(['completed', 'skipped']), at: z.number().int().min(0).max(8.64e15) }).optional(),
});

// ---------- student-built timetables ----------
const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM');
const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const endsAfterStart = (v, ctx) => {
  if (minutes(v.end) <= minutes(v.start)) ctx.addIssue({ code: 'custom', path: ['end'], message: 'end must be after start' });
};

const timetablePeriod = z.strictObject({ id: shortId, name: text(60), start: hhmm, end: hhmm }).superRefine(endsAfterStart);

const timetableEntry = z
  .strictObject({
    id: shortId,
    kind: z.enum(['class', 'break']),
    day: z.enum(DAYS),
    start: hhmm,
    end: hhmm,
    title: text(120),
    courseId: shortId.nullable().optional(),
    type: z.enum(['lecture', 'tutorial', 'lab', 'seminar', 'exam', 'other']).nullable().optional(),
    group: text(60).optional(),
    instructor: text(120).optional(),
    room: text(80).optional(),
    notes: text(1000).optional(),
    color: z.enum(['forest', 'gold', 'clay', 'sky', 'plum', 'slate']).nullable().optional(),
    periodId: shortId.nullable().optional(),
  })
  .superRefine(endsAfterStart);

const timetableProfile = z
  .strictObject({
    id: shortId,
    name: z.string().min(1).max(80),
    description: text(300).optional(),
    archived: z.boolean().optional(),
    days: z.array(z.enum(DAYS)).min(1).max(7),
    firstDay: z.enum(DAYS),
    mode: z.enum(['free', 'periods']),
    dayStart: hhmm,
    dayEnd: hhmm,
    periods: z.array(timetablePeriod).max(40),
    groups: z.array(text(60)).max(60),
    display: z.strictObject({ density: z.enum(['compact', 'detailed']), showRoom: z.boolean(), showInstructor: z.boolean(), showGroup: z.boolean() }),
    entries: z.array(timetableEntry).max(600),
    createdAt: z.number().int().min(0),
    updatedAt: z.number().int().min(0),
  })
  .superRefine((p, ctx) => {
    if (minutes(p.dayEnd) <= minutes(p.dayStart)) ctx.addIssue({ code: 'custom', path: ['dayEnd'], message: 'day must end after it starts' });
    if (new Set(p.days).size !== p.days.length) ctx.addIssue({ code: 'custom', path: ['days'], message: 'duplicate day' });
    if (!p.days.includes(p.firstDay)) ctx.addIssue({ code: 'custom', path: ['firstDay'], message: 'first day must be one of the days' });
    const periodIds = new Set(p.periods.map(x => x.id));
    if (periodIds.size !== p.periods.length) ctx.addIssue({ code: 'custom', path: ['periods'], message: 'duplicate period id' });
    const entryIds = new Set();
    p.entries.forEach((e, i) => {
      if (entryIds.has(e.id)) ctx.addIssue({ code: 'custom', path: ['entries', i, 'id'], message: 'duplicate entry id' });
      entryIds.add(e.id);
      if (e.periodId && !periodIds.has(e.periodId)) ctx.addIssue({ code: 'custom', path: ['entries', i, 'periodId'], message: 'unknown period' });
    });
  });

const plannerData = z.object({
  courses: z.array(course).max(500),
  sessions: z.array(studySession).max(5000).optional().default([]),
  commitments: z.array(commitment).max(5000),
  studyLog: z.array(studyLogEntry).max(100_000).optional().default([]),
  timetable: z.object({ name: text(255), type: text(100) }).nullable().optional().default(null),
  timerSettings: timerSettings.optional(),
  preferences: preferences.optional(),
  timetables: z.array(timetableProfile).max(20).optional(),
  activeTimetableId: shortId.nullable().optional(),
}).superRefine((d, ctx) => {
  // Cross-references inside the student's own document: courses and the active profile must exist.
  const courseIds = new Set(d.courses.map(c => c.id));
  const profileIds = new Set();
  (d.timetables ?? []).forEach((p, i) => {
    if (profileIds.has(p.id)) ctx.addIssue({ code: 'custom', path: ['timetables', i, 'id'], message: 'duplicate timetable id' });
    profileIds.add(p.id);
    p.entries.forEach((e, j) => {
      if (e.courseId && !courseIds.has(e.courseId)) ctx.addIssue({ code: 'custom', path: ['timetables', i, 'entries', j, 'courseId'], message: 'unknown course' });
    });
  });
  if (d.activeTimetableId && !profileIds.has(d.activeTimetableId)) ctx.addIssue({ code: 'custom', path: ['activeTimetableId'], message: 'unknown timetable' });
});

const schemas = {
  googleSignIn: z.strictObject({ credential: z.string().min(10).max(4096) }),
  discordStartQuery: z.object({ next: z.string().max(512).optional() }),
  discordCallbackQuery: z.object({
    code: z.string().min(1).max(512).optional(),
    state: z.string().max(128).optional(),
    error: z.string().max(64).optional(),
  }),
  putData: z.strictObject({ data: plannerData }),
  uploadFile: z.strictObject({
    data: z.string().min(16),
    name: z.string().max(255).optional(),
  }),
  fileParams: z.strictObject({ id: objectId }),
};

/** Parses `value` or throws INVALID_REQUEST with safe, bounded issue details. */
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const details = result.error.issues.slice(0, 5).map(issue => ({ path: issue.path.slice(0, 6).join('.'), problem: issue.code }));
  throw new AppError('INVALID_REQUEST', { details });
}

/** Collects GridFS ids referenced from planner data (for ownership checks and cleanup). */
function referencedFileIds(data) {
  const ids = new Set();
  for (const c of data.courses) for (const t of c.topics) if (t.pdf) ids.add(t.pdf.__cloudFile.toLowerCase());
  for (const c of data.commitments) if (c.pdf) ids.add(c.pdf.__cloudFile.toLowerCase());
  return [...ids];
}

module.exports = { schemas, parse, referencedFileIds };
