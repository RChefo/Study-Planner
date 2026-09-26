import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atMinutes, parseTimeRange, splitMeta } from '../../src/features/timetable/classTimes.ts';
import { buildTodayTimeline, nowIndex } from '../../src/features/dashboard/timeline.ts';
import { completedCommitments, groupOpenCommitments } from '../../src/features/commitments/grouping.ts';
import { entriesSince, periodStart } from '../../src/features/insights/selectors.ts';
import type { Commitment, StudyLogEntry } from '../../src/types/index.ts';

const NOW = new Date(2026, 8, 26, 12, 30).getTime(); // Sat 26 Sep 2026, 12:30 local
const at = (h: number, m = 0, dayOffset = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

test('parseTimeRange reads the timetable’s 12-hour strings as a school day', () => {
  assert.deepEqual(parseTimeRange('09:00 - 10:00'), { start: 540, end: 600 });
  assert.deepEqual(parseTimeRange('12:00 - 01:00'), { start: 720, end: 780 });
  assert.deepEqual(parseTimeRange('02:00 - 03:00'), { start: 840, end: 900 });
  assert.deepEqual(parseTimeRange('07:00 - 08:00'), { start: 1140, end: 1200 });
  assert.equal(parseTimeRange('soon'), null);
});

test('splitMeta separates instructor and room', () => {
  assert.deepEqual(splitMeta('Dr. Hany Muhammed / A303'), { instructor: 'Dr. Hany Muhammed', room: 'A303' });
  assert.deepEqual(splitMeta('Eng. Mariz'), { instructor: 'Eng. Mariz', room: '' });
});

test('atMinutes lands on the same calendar day', () => {
  assert.equal(new Date(atMinutes(NOW, 14 * 60 + 5)).getHours(), 14);
  assert.equal(new Date(atMinutes(NOW, 14 * 60 + 5)).getDate(), 26);
});

const entry = (id: string, start: number, minutes: number, completed = true, subject = 'Java'): StudyLogEntry => ({
  id,
  subject,
  topic: 'Loops',
  startedAt: start,
  endedAt: start + minutes * 60000,
  duration: minutes,
  completed,
  sessionId: null,
});

test('today timeline merges logged rounds, the running round and classes chronologically', () => {
  const items = buildTodayTimeline({
    log: [entry('a', at(8), 25), entry('b', at(10), 50, false), entry('old', at(9, 0, -1), 25)],
    classes: [
      { key: 'c1', title: 'Big Data', range: { start: 540, end: 600 }, room: 'A202', instructor: 'Dr. F' },
      { key: 'c2', title: 'Management', range: { start: 720, end: 780 }, room: 'O.L', instructor: 'Dr. N' },
      { key: 'c3', title: 'Hacking', range: { start: 840, end: 900 }, room: 'A02', instructor: 'Eng. M' },
      { key: 'bad', title: 'No time', range: null, room: '', instructor: '' },
    ],
    timer: { active: true, mode: 'focus', startedAt: at(12, 10), subject: 'Networks', topic: 'OSI' },
    now: NOW,
  });
  assert.deepEqual(
    items.map(i => [i.id, i.state]),
    [
      ['a', 'done'],
      ['class-c1', 'done'],
      ['b', 'done'],
      ['class-c2', 'now'],
      [`focus-${at(12, 10)}`, 'now'],
      ['class-c3', 'upcoming'],
    ],
  );
  assert.equal(items.find(i => i.id === 'b')?.completed, false);
  assert.equal(nowIndex(items, NOW), 5);
});

test('breaks are not shown as focus rounds, and an empty day yields no items', () => {
  const items = buildTodayTimeline({ log: [], classes: [], timer: { active: true, mode: 'shortBreak', startedAt: at(12), subject: 'x', topic: 'y' }, now: NOW });
  assert.deepEqual(items, []);
  assert.equal(nowIndex(items, NOW), 0);
});

const c = (id: string, dueDate: string, done = false): Commitment => ({ id, name: id, dueDate, description: '', done });

test('open commitments are grouped by urgency and completed ones are listed separately', () => {
  const all = [c('late', '2026-09-20'), c('today', '2026-09-26'), c('tomorrow', '2026-09-27'), c('week', '2026-10-01'), c('later', '2026-11-01'), c('none', ''), c('done', '2026-09-10', true)];
  const groups = groupOpenCommitments(all, NOW);
  assert.deepEqual(
    groups.map(g => [g.id, g.items.map(i => i.commitment.id)]),
    [
      ['overdue', ['late']],
      ['today', ['today']],
      ['tomorrow', ['tomorrow']],
      ['week', ['week']],
      ['later', ['later']],
      ['none', ['none']],
    ],
  );
  assert.deepEqual(completedCommitments(all).map(x => x.id), ['done']);
  assert.deepEqual(groupOpenCommitments([], NOW), []);
});

test('study-log periods: today, week from Saturday, month from the 1st', () => {
  assert.equal(periodStart('today', NOW), new Date(2026, 8, 26).getTime());
  assert.equal(periodStart('week', NOW), new Date(2026, 8, 26).getTime()); // Saturday itself
  assert.equal(periodStart('week', new Date(2026, 9, 2, 9).getTime()), new Date(2026, 8, 26).getTime()); // Friday → previous Saturday
  assert.equal(periodStart('month', NOW), new Date(2026, 8, 1).getTime());
  assert.equal(periodStart('all', NOW), null);
  const log = [entry('x', at(9), 10), entry('y', at(9, 0, -3), 10)];
  assert.deepEqual(entriesSince(log, periodStart('today', NOW)).map(l => l.id), ['x']);
  assert.equal(entriesSince(log, null).length, 2);
});

import { matchesQuery, normalizeSearch } from '../../src/lib/search.ts';

test('search folds Arabic letter variants, diacritics and case', () => {
  assert.equal(normalizeSearch('  أَمْنُ  الشبكة '), 'امن الشبكه');
  assert.ok(matchesQuery('أمن الشبكات', 'امن'));
  assert.ok(matchesQuery('Network Security', 'security net'));
  assert.ok(matchesQuery('مستشفى', 'مستشفي'));
  assert.equal(matchesQuery('Java', 'python'), false);
});
