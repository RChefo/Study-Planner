import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeProfile,
  addEntry,
  addPeriod,
  addProfile,
  applyStructure,
  conflictsWith,
  copyStructure,
  deleteEntry,
  deletePeriod,
  deleteProfile,
  duplicateDay,
  duplicateEntry,
  duplicateProfile,
  entriesOnDay,
  findConflicts,
  freeGaps,
  hiddenEntries,
  importUniversityTimetable,
  layoutDay,
  movePeriod,
  newProfile,
  normalizeTimetables,
  orderedDays,
  renameProfile,
  setActive,
  setArchived,
  setDays,
  suggestPeriod,
  unlinkCourse,
  updateEntry,
  updatePeriod,
  validateEntry,
  validatePeriod,
  visibleRange,
  withGroup,
  type TimetableState,
} from '../../src/features/timetable/builder.ts';
import type { TimetableEntry } from '../../src/types/planner.ts';

const NOW = 1_760_000_000_000;
let n = 0;
const next = () => `id${++n}`;
const empty: TimetableState = { timetables: [], activeTimetableId: null };
const cls = (id: string, day: TimetableEntry['day'], start: string, end: string, extra: Partial<TimetableEntry> = {}): TimetableEntry => ({ id, kind: 'class', day, start, end, title: id, ...extra });
const p1 = (s: TimetableState) => s.timetables[0];

test('create, rename, switch and duplicate timetable profiles', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: '  الترم الأول ', now: NOW }));
  assert.equal(s.activeTimetableId, 'a');
  assert.equal(p1(s).name, 'الترم الأول');
  assert.deepEqual(p1(s).days, ['sun', 'mon', 'tue', 'wed', 'thu'], 'default Egyptian week, changeable');
  assert.equal(p1(s).mode, 'free');
  assert.deepEqual(p1(s).entries, [], 'no invented classes');
  s = renameProfile(s, 'a', 'Semester 1', NOW + 1);
  assert.equal(p1(s).name, 'Semester 1');
  assert.equal(p1(s).updatedAt, NOW + 1);
  s = addProfile(s, newProfile({ id: 'b', name: 'Summer', now: NOW }), false);
  assert.equal(s.activeTimetableId, 'a');
  s = setActive(s, 'b');
  assert.equal(s.activeTimetableId, 'b');
  s = setActive(s, 'missing');
  assert.equal(s.activeTimetableId, 'b');
  s = addEntry(s, 'a', cls('e1', 'sun', '09:00', '10:00'), NOW);
  s = duplicateProfile(s, 'a', { profile: 'c', next }, NOW);
  const copy = s.timetables.find(p => p.id === 'c')!;
  assert.equal(copy.name, 'Semester 1 (نسخة)');
  assert.equal(copy.entries.length, 1);
  assert.notEqual(copy.entries[0].id, 'e1', 'fresh ids');
  assert.equal(s.activeTimetableId, 'b', 'duplicating does not switch');
});

test('archive and delete keep a sensible active timetable', () => {
  let s = addProfile(addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW })), newProfile({ id: 'b', name: 'B', now: NOW }));
  assert.equal(s.activeTimetableId, 'b');
  s = setArchived(s, 'b', true, NOW);
  assert.equal(s.activeTimetableId, 'a');
  assert.equal(setActive(s, 'b').activeTimetableId, 'a', 'archived profiles cannot be active');
  assert.equal(activeProfile(s)?.id, 'a');
  s = deleteProfile(s, 'a');
  assert.equal(s.activeTimetableId, null);
  assert.equal(activeProfile(s), null);
  s = setArchived(s, 'b', false, NOW);
  assert.equal(s.activeTimetableId, 'b');
});

test('custom week: any days, any first day; removing a day hides (never deletes) its classes', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW, days: ['fri', 'mon', 'tue', 'wed', 'thu'], firstDay: 'mon' }));
  assert.deepEqual(orderedDays(p1(s)), ['mon', 'tue', 'wed', 'thu', 'fri']);
  s = addEntry(s, 'a', cls('f', 'fri', '09:00', '10:00'), NOW);
  s = setDays(s, 'a', ['mon', 'tue'], NOW);
  assert.deepEqual(p1(s).days, ['mon', 'tue']);
  assert.equal(p1(s).entries.length, 1);
  assert.equal(hiddenEntries(p1(s)), 1);
  assert.equal(setDays(s, 'a', [], NOW), s, 'at least one day');
  s = setDays(s, 'a', ['mon', 'tue', 'fri'], NOW);
  assert.equal(hiddenEntries(p1(s)), 0);
});

test('free-time mode: exact times, no alignment required', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW }));
  s = addEntry(s, 'a', cls('java', 'sun', '09:15', '10:45', { courseId: 'c-java' }), NOW);
  s = addEntry(s, 'a', cls('net', 'sun', '12:20', '13:50'), NOW);
  assert.deepEqual(entriesOnDay(p1(s), 'sun').map(e => [e.start, e.end]), [['09:15', '10:45'], ['12:20', '13:50']]);
  assert.deepEqual(freeGaps(entriesOnDay(p1(s), 'sun')), [{ start: '10:45', end: '12:20', minutes: 95 }], 'free time shown, not stored');
  assert.equal(p1(s).entries.length, 2);
});

test('period mode: add, rename, retime (moves attached classes), reorder, delete (keeps classes), breaks between periods', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW, mode: 'periods' }));
  s = addPeriod(s, 'a', { id: 'p1', name: 'الفترة 1', start: '08:00', end: '09:30' }, NOW);
  assert.deepEqual(suggestPeriod(p1(s)), { name: 'الفترة 2', start: '09:30', end: '11:00' });
  s = addPeriod(s, 'a', { id: 'p2', name: 'الفترة 2', start: '10:00', end: '11:30' }, NOW); // a gap = break time
  s = addEntry(s, 'a', cls('java', 'sun', '10:00', '11:30', { periodId: 'p2' }), NOW);
  s = updatePeriod(s, 'a', 'p2', { name: 'Second', start: '10:15', end: '11:45' }, NOW);
  assert.equal(p1(s).periods[1].name, 'Second');
  assert.deepEqual([p1(s).entries[0].start, p1(s).entries[0].end], ['10:15', '11:45']);
  s = movePeriod(s, 'a', 'p2', -1, NOW);
  assert.deepEqual(p1(s).periods.map(p => p.id), ['p2', 'p1']);
  assert.deepEqual(p1(movePeriod(s, 'a', 'p2', -1, NOW)).periods.map(p => p.id), ['p2', 'p1'], 'already first: unchanged');
  s = deletePeriod(s, 'a', 'p2', NOW);
  assert.deepEqual(p1(s).periods.map(p => p.id), ['p1']);
  assert.equal(p1(s).entries.length, 1, 'class kept');
  assert.equal(p1(s).entries[0].periodId, null);
  assert.equal(p1(s).entries[0].start, '10:15');
  assert.deepEqual(validatePeriod({ name: '', start: '09:00', end: '08:00' }), { name: 'اكتب اسم الفترة', end: 'يجب أن ينتهي بعد البداية' });
});

test('entries: create, edit (move day / time), duplicate, delete; breaks are their own kind', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW }));
  s = addEntry(s, 'a', cls('e', 'sun', '09:00', '10:00'), NOW);
  s = updateEntry(s, 'a', 'e', { day: 'tue', start: '11:00', end: '12:00', room: 'Hall 4' }, NOW);
  assert.deepEqual(entriesOnDay(p1(s), 'tue').map(e => [e.id, e.start, e.room]), [['e', '11:00', 'Hall 4']]);
  s = duplicateEntry(s, 'a', 'e', 'e2', NOW, 'wed');
  assert.equal(entriesOnDay(p1(s), 'wed')[0].room, 'Hall 4');
  s = addEntry(s, 'a', { id: 'lunch', kind: 'break', day: 'tue', start: '12:00', end: '13:00', title: 'Lunch' }, NOW);
  s = deleteEntry(s, 'a', 'e2', NOW);
  assert.deepEqual(p1(s).entries.map(e => e.id), ['e', 'lunch']);
});

test('duplicate a whole day and copy a week structure to another profile', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW, mode: 'periods' }));
  s = addPeriod(s, 'a', { id: 'p1', name: 'P1', start: '08:00', end: '09:00' }, NOW);
  s = addEntry(s, 'a', cls('x', 'sun', '08:00', '09:00', { group: 'G1' }), NOW);
  s = addEntry(s, 'a', cls('y', 'sun', '10:00', '11:00'), NOW);
  s = duplicateDay(s, 'a', 'sun', ['mon', 'tue', 'sun'], next, NOW);
  assert.equal(entriesOnDay(p1(s), 'mon').length, 2);
  assert.equal(entriesOnDay(p1(s), 'sun').length, 2, 'source day unchanged');
  s = addProfile(s, newProfile({ id: 'b', name: 'B', now: NOW, days: ['sat'] }), false);
  s = addEntry(s, 'b', cls('keep', 'sat', '09:00', '10:00', { periodId: null }), NOW);
  s = copyStructure(s, 'a', 'b', next, NOW);
  const b = s.timetables.find(p => p.id === 'b')!;
  assert.equal(b.mode, 'periods');
  assert.deepEqual(b.days, p1(s).days);
  assert.equal(b.periods.length, 1);
  assert.notEqual(b.periods[0].id, 'p1');
  assert.deepEqual(b.entries.map(e => e.id), ['keep'], 'classes are not copied by a structure copy');
  assert.deepEqual(b.groups, ['G1']);
});

test('course linking is optional; deleting a course leaves a standalone class with its name', () => {
  const linked: TimetableEntry = cls('j', 'sun', '10:00', '12:00', { title: '', courseId: 'c-java', type: 'lecture', group: 'Group A', room: 'Hall 4' });
  assert.deepEqual(validateEntry(linked, ['c-java']), {});
  assert.deepEqual(validateEntry({ ...linked, courseId: 'nope' }, ['c-java']).courseId, 'المادة غير موجودة');
  assert.deepEqual(validateEntry({ ...linked, courseId: null }, []).title, 'اختر مادة أو اكتب اسم الحصة');
  assert.deepEqual(validateEntry({ ...linked, courseId: null, title: 'Gym' }, []), {}, 'standalone entries are fine');
  const s = addEntry(addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW })), 'a', linked, NOW);
  const after = unlinkCourse(s.timetables, 'c-java', 'Java Programming')!;
  assert.equal(after[0].entries[0].courseId, null);
  assert.equal(after[0].entries[0].title, 'Java Programming');
});

test('groups are optional and named by the student', () => {
  assert.deepEqual(withGroup([], undefined), []);
  assert.deepEqual(withGroup([], '  '), []);
  assert.deepEqual(withGroup(['Group A'], 'group a'), ['Group A'], 'no near-duplicates');
  assert.deepEqual(withGroup(['Group A'], 'Lab 2'), ['Group A', 'Lab 2']);
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW }));
  s = addEntry(s, 'a', cls('e', 'sun', '09:00', '10:00', { group: 'Section 4' }), NOW);
  s = addEntry(s, 'a', cls('f', 'sun', '10:00', '11:00'), NOW);
  assert.deepEqual(p1(s).groups, ['Section 4']);
});

test('conflicts are detected (classes only) and never block saving', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW }));
  s = addEntry(s, 'a', cls('java', 'sun', '10:00', '12:00'), NOW);
  s = addEntry(s, 'a', cls('net', 'sun', '11:30', '13:00'), NOW);
  s = addEntry(s, 'a', cls('touching', 'sun', '13:00', '14:00'), NOW);
  s = addEntry(s, 'a', { id: 'lunch', kind: 'break', day: 'sun', start: '12:30', end: '13:30', title: 'Lunch' }, NOW);
  const c = findConflicts(p1(s));
  assert.deepEqual(c.map(x => [x.a.id, x.b.id]), [['java', 'net']]);
  assert.equal(p1(s).entries.length, 4, 'conflicting entry was saved');
  assert.deepEqual(conflictsWith(p1(s), { kind: 'class', day: 'sun', start: '11:00', end: '11:45' }).map(e => e.id), ['java', 'net']);
  assert.deepEqual(conflictsWith(p1(s), { kind: 'class', day: 'sun', start: '11:00', end: '11:45' }, 'java').map(e => e.id), ['net']);
});

test('invalid times are rejected by validation', () => {
  const base = cls('e', 'sun', '09:00', '10:00', { title: 'X' });
  assert.equal(validateEntry({ ...base, end: '09:00' }, []).end, 'يجب أن ينتهي بعد البداية');
  assert.equal(validateEntry({ ...base, start: '25:00' }, []).start, 'وقت غير صالح');
  assert.equal(validateEntry({ ...base, day: 'xyz' as never }, []).day, 'اختر اليوم');
});

test('the grid range stretches to fit classes outside the configured hours', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW }));
  assert.deepEqual(visibleRange(p1(s)), { start: 480, end: 1080 });
  s = addEntry(s, 'a', cls('late', 'sun', '19:10', '20:40'), NOW);
  assert.deepEqual(visibleRange(p1(s)), { start: 480, end: 1260 });
});

test('importing the built-in university timetable keeps the data as written, for one group', () => {
  const p = importUniversityTimetable({ id: 'u', group: 2, now: NOW, next });
  assert.equal(p.mode, 'periods');
  assert.deepEqual(p.groups, ['المجموعة 2']);
  assert.ok(p.periods.length > 5 && p.entries.length > 5);
  assert.ok(p.entries.every(e => e.group === 'المجموعة 2' && e.kind === 'class' && e.type === null), 'no invented types');
  const alt = p.entries.find(e => /^\((1|2)\)/.test(e.title));
  assert.ok(alt?.notes?.includes('بالتناوب'), 'alternate-week tag explained, not guessed away');
  assert.ok(p.entries.every(e => e.periodId && p.periods.some(pe => pe.id === e.periodId)));
  assert.equal(findConflicts(p).length >= 0, true);
});

test('untrusted stored data is normalised: bad entries dropped, dangling links cleared, active id checked', () => {
  const raw = [
    {
      id: 'a',
      name: 'A',
      days: ['sun', 'bogus', 'mon'],
      firstDay: 'fri',
      mode: 'periods',
      dayStart: '08:00',
      dayEnd: '07:00',
      periods: [{ id: 'p', name: 'P', start: '08:00', end: '09:00' }, { id: 'bad', name: 'x', start: '10:00', end: '09:00' }],
      groups: ['G1', 3, ''],
      display: { density: 'compact', showRoom: false },
      entries: [
        { id: 'ok', kind: 'class', day: 'sun', start: '08:00', end: '09:00', title: 'Java', courseId: 'c1', periodId: 'p', color: 'gold', type: 'lab' },
        { id: 'gone', kind: 'class', day: 'sun', start: '08:00', end: '09:00', title: 'Old', courseId: 'deleted', periodId: 'bad', color: 'neon', type: 'party' },
        { id: 'inverted', kind: 'class', day: 'sun', start: '10:00', end: '09:00', title: 'X' },
        { id: 'noday', kind: 'class', day: 'someday', start: '08:00', end: '09:00', title: 'X' },
      ],
    },
    { id: 'a', name: 'duplicate id' },
    'junk',
  ];
  const { timetables, activeTimetableId } = normalizeTimetables(raw, 'missing', ['c1']);
  assert.equal(timetables!.length, 1);
  const p = timetables![0];
  assert.deepEqual(p.days, ['sun', 'mon']);
  assert.equal(p.firstDay, 'sun');
  assert.equal(p.dayEnd, '18:00');
  assert.deepEqual(p.periods.map(x => x.id), ['p']);
  assert.deepEqual(p.groups, ['G1']);
  assert.deepEqual(p.display, { density: 'compact', showRoom: false, showInstructor: true, showGroup: true });
  assert.deepEqual(p.entries.map(e => e.id), ['ok', 'gone']);
  assert.equal(p.entries[1].courseId, null);
  assert.equal(p.entries[1].periodId, null);
  assert.equal(p.entries[1].color, null);
  assert.equal(p.entries[1].type, null);
  assert.equal(activeTimetableId, 'a');
  assert.deepEqual(normalizeTimetables(undefined, null, []), {}, 'older data without timetables stays untouched');
});


test('settings apply in one step: renamed, retimed periods move their classes; removed periods free them', () => {
  let s = addProfile(empty, newProfile({ id: 'a', name: 'A', now: NOW, mode: 'periods' }));
  s = addPeriod(s, 'a', { id: 'p1', name: 'P1', start: '08:00', end: '09:00' }, NOW);
  s = addPeriod(s, 'a', { id: 'p2', name: 'P2', start: '09:00', end: '10:00' }, NOW);
  s = addEntry(s, 'a', cls('x', 'sun', '08:00', '09:00', { periodId: 'p1' }), NOW);
  s = addEntry(s, 'a', cls('y', 'sun', '09:00', '10:00', { periodId: 'p2' }), NOW);
  const p = p1(s);
  s = applyStructure(s, 'a', { ...p, name: 'Semester', days: ['sat', 'sun'], firstDay: 'sat', periods: [{ id: 'p1', name: 'First', start: '08:30', end: '10:00' }] }, NOW + 5);
  const q = p1(s);
  assert.equal(q.name, 'Semester');
  assert.deepEqual(q.days, ['sat', 'sun']);
  assert.deepEqual([q.entries[0].start, q.entries[0].end, q.entries[0].periodId], ['08:30', '10:00', 'p1']);
  assert.deepEqual([q.entries[1].start, q.entries[1].periodId], ['09:00', null]);
  assert.equal(q.updatedAt, NOW + 5);
});

test('overlapping classes share a column side by side; separate ones use the full width', () => {
  const l = layoutDay([
    { id: 'a', start: '10:00', end: '12:00' },
    { id: 'b', start: '11:30', end: '13:00' },
    { id: 'c', start: '12:00', end: '12:30' },
    { id: 'd', start: '14:00', end: '15:00' },
  ]);
  assert.deepEqual(l.get('a'), { lane: 0, lanes: 2 });
  assert.deepEqual(l.get('b'), { lane: 1, lanes: 2 });
  assert.deepEqual(l.get('c'), { lane: 0, lanes: 2 }, 'reuses the freed lane');
  assert.deepEqual(l.get('d'), { lane: 0, lanes: 1 });
});
