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

const plannerData = z.object({
  courses: z.array(course).max(500),
  sessions: z.array(studySession).max(5000).optional().default([]),
  commitments: z.array(commitment).max(5000),
  studyLog: z.array(studyLogEntry).max(100_000).optional().default([]),
  timetable: z.object({ name: text(255), type: text(100) }).nullable().optional().default(null),
  timerSettings: timerSettings.optional(),
  preferences: preferences.optional(),
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
