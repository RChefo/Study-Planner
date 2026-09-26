import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseInfo, dailyTotals, dueInfo, minutesBySubject, nextUp, openCommitments, streaks, summary, dayKey } from '../../src/features/insights/selectors.ts';
import type { PlannerData, StudyLogEntry, TimerState } from '../../src/types/index.ts';

const NOW = new Date(2026, 8, 25, 21, 0).getTime(); // Fri 25 Sep 2026, 21:00 local
const at = (daysAgo: number, hour = 10) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};
let seq = 0;
const log = (daysAgo: number, subject: string, topic: string, duration = 25, completed = true, hour = 10): StudyLogEntry => ({
  id: `l${seq++}`,
  subject,
  topic,
  startedAt: at(daysAgo, hour),
  endedAt: at(daysAgo, hour) + duration * 60000,
  duration,
  completed,
  sessionId: null,
});

const data: PlannerData = {
  courses: [
    { id: 'java', name: 'Java', topics: [{ name: 'Variables', done: true }, { name: 'Loops', done: false }, { name: 'OOP', done: false }] },
    { id: 'net', name: 'Networks', topics: [{ name: 'OSI', done: false }, { name: 'TCP', done: false }] },
    { id: 'empty', name: 'Empty', topics: [] },
    { id: 'finished', name: 'Finished', topics: [{ name: 'All', done: true }] },
  ],
  sessions: [],
  commitments: [
    { id: 'a', name: 'Later', dueDate: '2026-10-20', description: '' },
    { id: 'b', name: 'Overdue', dueDate: '2026-09-20', description: '' },
    { id: 'c', name: 'No date', dueDate: '', description: '' },
    { id: 'd', name: 'Tomorrow', dueDate: '2026-09-26', description: '' },
    { id: 'e', name: 'Done', dueDate: '2026-09-25', description: '', done: true },
  ],
  studyLog: [log(0, 'Networks', 'OSI', 25, true, 18), log(0, 'Java', 'Variables', 50), log(1, 'Java', 'Loops', 25, false), log(2, 'Java', 'Variables'), log(5, 'Networks', 'OSI')],
  timetable: null,
};

test('dailyTotals returns a fixed window ending today, with zero days filled', () => {
  const days = dailyTotals(data.studyLog, NOW, 7);
  assert.equal(days.length, 7);
  assert.equal(days[6].key, dayKey(NOW));
  assert.equal(days[6].minutes, 75);
  assert.equal(days[6].sessions, 2);
  assert.equal(days[5].minutes, 25);
  assert.equal(days[3].minutes, 0);
});

test('streak counts consecutive study days and survives an unstudied today', () => {
  assert.deepEqual(streaks(data.studyLog, NOW), { current: 3, longest: 3 });
  const yesterdayOnly = [log(1, 'x', 'y'), log(2, 'x', 'y')];
  assert.equal(streaks(yesterdayOnly, NOW).current, 2, 'not broken until today ends');
  assert.equal(streaks([log(3, 'x', 'y')], NOW).current, 0);
  assert.deepEqual(streaks([], NOW), { current: 0, longest: 0 });
});

test('courseInfo derives progress, lecture statuses and next lecture', () => {
  const java = courseInfo(data.courses[0], data.studyLog);
  assert.equal(java.total, 3);
  assert.equal(java.done, 1);
  assert.equal(java.percent, 33);
  assert.equal(java.minutes, 100);
  assert.deepEqual(java.lectures.map(l => l.status), ['done', 'in-progress', 'not-started']);
  assert.equal(java.nextLecture?.name, 'Loops', 'in-progress lecture comes first');
  assert.equal(java.lastStudiedAt, at(0));
  assert.equal(courseInfo(data.courses[2], data.studyLog).nextLecture, null);
  const running = { active: true, mode: 'focus', subject: 'Java', topic: 'OOP' } as TimerState;
  assert.equal(courseInfo(data.courses[0], [], running).lectures[2].status, 'in-progress');
});

test('nextUp suggests one lecture per course, most recently active first, skipping finished courses', () => {
  const next = nextUp(data, null, 5);
  assert.deepEqual(next.map(n => `${n.info.course.name}:${n.lecture.name}`), ['Networks:OSI', 'Java:Loops']);
});

test('due dates classify relative to the local day', () => {
  assert.deepEqual(dueInfo('2026-09-25', NOW), { state: 'today', days: 0 });
  assert.deepEqual(dueInfo('2026-09-26', NOW), { state: 'tomorrow', days: 1 });
  assert.deepEqual(dueInfo('2026-09-24', NOW), { state: 'overdue', days: -1 });
  assert.equal(dueInfo('2026-10-01', NOW).state, 'soon');
  assert.equal(dueInfo('2026-11-01', NOW).state, 'later');
  assert.deepEqual(dueInfo('', NOW), { state: 'none', days: null });
  assert.deepEqual(dueInfo('garbage', NOW), { state: 'none', days: null });
});

test('open commitments are ordered overdue → soonest → undated, done excluded', () => {
  assert.deepEqual(openCommitments(data.commitments, NOW).map(c => c.commitment.name), ['Overdue', 'Tomorrow', 'Later', 'No date']);
});

test('summary and per-subject minutes', () => {
  const s = summary(data);
  assert.equal(s.totalMinutes, 150);
  assert.equal(s.sessions, 5);
  assert.equal(s.averageMinutes, 30);
  assert.equal(s.completionRate, 80);
  assert.deepEqual([s.lecturesDone, s.lecturesTotal], [2, 6]);
  assert.deepEqual(minutesBySubject(data.studyLog), [{ subject: 'Java', minutes: 100 }, { subject: 'Networks', minutes: 50 }]);
});
