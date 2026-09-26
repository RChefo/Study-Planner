'use strict';

/**
 * Student-built timetables through the real API: they round-trip inside the user's own planner
 * document, are never visible to another user (the session decides the owner — no ids in the
 * URL to tamper with), and malformed or cross-referencing data is rejected with 400.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request } = require('../support/http');

let t;
let alice;
let bob;
before(async () => {
  t = await startTestApp();
  alice = await t.signIn('tt-alice');
  bob = await t.signIn('tt-bob');
});
after(() => t.close());

const profile = (over = {}) => ({
  id: 'tt1',
  name: 'الترم الأول',
  days: ['sun', 'mon', 'tue', 'wed', 'thu'],
  firstDay: 'sun',
  mode: 'periods',
  dayStart: '08:00',
  dayEnd: '18:00',
  periods: [{ id: 'p1', name: 'الفترة 1', start: '08:00', end: '09:30' }],
  groups: ['Group A'],
  display: { density: 'detailed', showRoom: true, showInstructor: true, showGroup: true },
  entries: [
    { id: 'e1', kind: 'class', day: 'sun', start: '08:00', end: '09:30', title: '', courseId: 'java', type: 'lecture', group: 'Group A', room: 'Hall 4', periodId: 'p1' },
    { id: 'e2', kind: 'class', day: 'mon', start: '12:20', end: '13:50', title: 'Gym', courseId: null },
    { id: 'b1', kind: 'break', day: 'sun', start: '10:30', end: '11:00', title: 'استراحة' },
  ],
  createdAt: 1,
  updatedAt: 2,
  ...over,
});
const planner = (tt, extra = {}) => ({ courses: [{ id: 'java', name: 'Java', topics: [] }], commitments: [], timetables: tt, activeTimetableId: tt[0]?.id ?? null, ...extra });
const put = (cookie, data) => request(t.base, '/api/data', { method: 'PUT', cookie, body: { data } });

test('a timetable round-trips inside the owner’s planner and stays private to them', async () => {
  const saved = await put(alice, planner([profile()]));
  assert.equal(saved.status, 200, saved.text);
  const mine = await request(t.base, '/api/data', { cookie: alice });
  assert.equal(mine.json.data.timetables[0].entries.length, 3);
  assert.equal(mine.json.data.timetables[0].entries[0].courseId, 'java');
  assert.equal(mine.json.data.activeTimetableId, 'tt1');

  // Bob sees only his own (empty) document, and writing his own copy never touches Alice's.
  const theirs = await request(t.base, '/api/data', { cookie: bob });
  assert.ok(!theirs.json.data || !theirs.json.data.timetables, 'no access to another user’s timetable');
  assert.equal((await put(bob, planner([profile({ name: 'Bob' })]))).status, 200);
  const again = await request(t.base, '/api/data', { cookie: alice });
  assert.equal(again.json.data.timetables[0].name, 'الترم الأول');
});

test('older documents without timetables are still accepted (backward compatible)', async () => {
  const res = await put(alice, { courses: [], commitments: [] });
  assert.equal(res.status, 200, res.text);
});

test('invalid timetable data is rejected', async () => {
  const cases = {
    'end before start': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '11:00', end: '10:00', title: 'X' }] }),
    'bad time format': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '9:00', end: '10:00', title: 'X' }] }),
    'invalid day': profile({ entries: [{ id: 'x', kind: 'class', day: 'someday', start: '09:00', end: '10:00', title: 'X' }] }),
    'unknown course reference': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '09:00', end: '10:00', title: '', courseId: 'not-mine' }] }),
    'unknown period reference': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '09:00', end: '10:00', title: 'X', periodId: 'nope' }] }),
    'duplicate entry ids': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '09:00', end: '10:00', title: 'A' }, { id: 'x', kind: 'class', day: 'mon', start: '09:00', end: '10:00', title: 'B' }] }),
    'period ends before it starts': profile({ periods: [{ id: 'p1', name: 'P', start: '10:00', end: '09:00' }], entries: [] }),
    'no days': profile({ days: [], firstDay: 'sun' }),
    'first day not in week': profile({ firstDay: 'fri' }),
    'day ends before it starts': profile({ dayStart: '18:00', dayEnd: '08:00' }),
    'unexpected fields (e.g. owner ids)': profile({ ownerId: 'someone-else' }),
    'unknown type': profile({ entries: [{ id: 'x', kind: 'class', day: 'sun', start: '09:00', end: '10:00', title: 'X', type: 'party' }] }),
  };
  for (const [name, tt] of Object.entries(cases)) {
    const res = await put(alice, planner([tt]));
    assert.equal(res.status, 400, `${name} → ${res.status}`);
  }
  assert.equal((await put(alice, planner([profile(), profile()]))).status, 400, 'duplicate timetable ids');
  assert.equal((await put(alice, planner([profile()], { activeTimetableId: 'not-a-profile' }))).status, 400, 'active timetable must exist');
  // After all the rejected writes, Alice's saved timetable is intact.
  const mine = await request(t.base, '/api/data', { cookie: alice });
  assert.ok(mine.json.data.timetables === undefined || mine.json.data.timetables.every(p => p.entries.every(e => e.id !== 'x')));
});
