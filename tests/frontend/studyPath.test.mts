import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smoothPath, withLeads } from '../../src/layouts/shell/pathGeometry.ts';
import { STATIONS, stationIndex } from '../../src/layouts/shell/navModel.ts';

test('station matching: today, nested course pages, and off-path routes', () => {
  assert.equal(stationIndex('/app'), 0);
  assert.equal(stationIndex('/app/'), 0);
  assert.equal(STATIONS[stationIndex('/app/courses')].label, 'المواد');
  assert.equal(STATIONS[stationIndex('/app/courses/java')].label, 'المواد');
  assert.equal(STATIONS[stationIndex('/app/study-log')].label, 'سجل المذاكرة');
  assert.equal(STATIONS[stationIndex('/app/stats')].label, 'الإحصائيات');
  assert.equal(stationIndex('/app/settings'), -1);
  assert.equal(stationIndex('/app/timer'), -1);
  assert.equal(stationIndex('/app/coursesX'), -1);
});

test('the path starts at Today and follows the study workflow', () => {
  assert.deepEqual(
    STATIONS.map(s => s.group),
    ['today', 'study', 'study', 'plan', 'plan', 'progress'],
  );
  assert.equal(STATIONS.filter(s => s.weight === 'home').length, 1);
});

test('smoothPath draws a curve through every point', () => {
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([{ x: 1, y: 2 }]), 'M1 2');
  const d = smoothPath([
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 0 },
  ]);
  assert.match(d, /^M0 0 C.* 10 5 C.* 20 0$/);
});

test('withLeads extends the path from the reading-start edge in both directions', () => {
  const pts = [
    { x: 300, y: 10 },
    { x: 100, y: 12 },
  ];
  assert.deepEqual(withLeads(pts, 400, true, 20), [{ x: 320, y: 10 }, ...pts, { x: 80, y: 12 }]);
  const ltr = [
    { x: 100, y: 10 },
    { x: 300, y: 12 },
  ];
  assert.deepEqual(withLeads(ltr, 400, false, 20), [{ x: 80, y: 10 }, ...ltr, { x: 320, y: 12 }]);
  assert.deepEqual(withLeads([{ x: 5, y: 1 }], 400, false, 20)[0], { x: 0, y: 1 });
});
