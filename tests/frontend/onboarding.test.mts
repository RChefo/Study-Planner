import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, needsNavigation, parseOnboarding, placePopover, shouldAutoStart, tourReducer, waitForTarget, type Rect } from '../../src/features/onboarding/tourModel.ts';

const ready = { status: 'authenticated' as const, cloudReady: true, startedThisSession: false };

test('a first-time student gets the tour automatically (signed in or on this device)', () => {
  assert.equal(shouldAutoStart({ ...ready, onboarding: undefined }), true);
  assert.equal(shouldAutoStart({ status: 'local', cloudReady: false, startedThisSession: false, onboarding: undefined }), true);
});

test('completed or skipped students never get it automatically', () => {
  assert.equal(shouldAutoStart({ ...ready, onboarding: { status: 'completed' } }), false);
  assert.equal(shouldAutoStart({ ...ready, onboarding: { status: 'skipped' } }), false);
});

test('the tour waits for the account data and opens at most once per session', () => {
  assert.equal(shouldAutoStart({ ...ready, cloudReady: false, onboarding: undefined }), false);
  assert.equal(shouldAutoStart({ ...ready, status: 'loading', onboarding: undefined }), false);
  assert.equal(shouldAutoStart({ ...ready, status: 'anonymous', onboarding: undefined }), false);
  assert.equal(shouldAutoStart({ ...ready, startedThisSession: true, onboarding: undefined }), false);
});

test('next / previous move through the steps and stop at the ends; manual restart begins at step 1', () => {
  const n = TOUR_STEPS.length;
  let s = tourReducer({ active: false, index: 0 }, { type: 'start' }, n);
  assert.deepEqual(s, { active: true, index: 0 });
  s = tourReducer(s, { type: 'prev' }, n);
  assert.equal(s.index, 0);
  for (let i = 0; i < n + 3; i++) s = tourReducer(s, { type: 'next' }, n);
  assert.equal(s.index, n - 1);
  s = tourReducer(s, { type: 'prev' }, n);
  assert.equal(s.index, n - 2);
  s = tourReducer(s, { type: 'close' }, n);
  assert.equal(s.active, false);
  // restart after completing/skipping: always from the beginning
  s = tourReducer(s, { type: 'start' }, n);
  assert.deepEqual(s, { active: true, index: 0 });
  assert.equal(tourReducer({ active: false, index: 3 }, { type: 'next' }, n).index, 3);
});

test('route-changing steps: the tour visits the real pages and ends back on Today', () => {
  const routes = TOUR_STEPS.map(s => s.route);
  assert.deepEqual([...new Set(routes)], ['/app', '/app/courses', '/app/timetable', '/app/commitments', '/app/stats']);
  assert.equal(routes[0], '/app');
  assert.equal(routes[routes.length - 1], '/app');
  const courses = TOUR_STEPS.find(s => s.id === 'courses')!;
  assert.equal(needsNavigation('/app', courses), true);
  assert.equal(needsNavigation('/app/courses/', courses), false);
  assert.ok(TOUR_STEPS.every(s => s.title && s.body.length < 140), 'short copy');
});

test('completion and skip persist in (normalised) preferences; junk is ignored', () => {
  for (const status of ['completed', 'skipped'] as const) {
    const stored = parseOnboarding({ status, at: 123 });
    assert.deepEqual(stored, { status, at: 123 });
    assert.equal(shouldAutoStart({ ...ready, onboarding: stored }), false);
  }
  assert.equal(parseOnboarding({ status: 'maybe' }), undefined);
  assert.equal(parseOnboarding(null), undefined);
  assert.deepEqual(parseOnboarding({ status: 'skipped', at: 'x' }), { status: 'skipped', at: 0 });
});

test('a missing target never crashes the tour: it resolves to null after the timeout', async () => {
  let t = 0;
  const found = await waitForTarget(() => null, { timeout: 500, interval: 100, now: () => t, sleep: async ms => void (t += ms) });
  assert.equal(found, null);
  const throwing = await waitForTarget(() => { throw new Error('boom'); }, { timeout: 100, interval: 50, now: () => t, sleep: async ms => void (t += ms) });
  assert.equal(throwing, null);
  let calls = 0;
  const late = await waitForTarget(() => (++calls >= 3 ? 'el' : null), { timeout: 1000, interval: 10, now: () => t, sleep: async ms => void (t += ms) });
  assert.equal(late, 'el');
  assert.equal(placePopover({ target: null, pop: { w: 300, h: 180 }, viewport: { w: 1440, h: 900 } }).mode, 'center');
});

const inside = (p: { x: number; y: number }, w: number, h: number, vw: number, vh: number) => p.x >= 0 && p.y >= 0 && p.x + w <= vw && p.y + h <= vh;
const clear = (a: Rect, b: Rect) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

test('desktop: the popover sits next to the target, inside the viewport, never over it', () => {
  const pop = { w: 340, h: 190 };
  const vp = { w: 1440, h: 900 };
  const top = placePopover({ target: { x: 700, y: 100, w: 200, h: 60 }, pop, viewport: vp });
  assert.equal(top.mode, 'anchored');
  assert.equal(top.mode === 'anchored' && top.side, 'bottom');
  const low = placePopover({ target: { x: 700, y: 760, w: 200, h: 60 }, pop, viewport: vp });
  assert.equal(low.mode === 'anchored' && low.side, 'top');
  // Focus control in the corner: the popover must avoid it
  const focus: Rect = { x: 24, y: 820, w: 110, h: 48 };
  const p = placePopover({ target: focus, pop, viewport: vp, obstacles: [] });
  assert.ok(inside(p, pop.w, pop.h, vp.w, vp.h));
  assert.ok(clear({ x: p.x, y: p.y, w: pop.w, h: pop.h }, focus));
});

test('mobile: a compact sheet on the edge away from the target, clear of the footer path and Focus', () => {
  const pop = { w: 351, h: 200 };
  for (const vw of [320, 375]) {
    const vp = { w: vw, h: 700 };
    const footer: Rect = { x: 0, y: 624, w: vw, h: 76 };
    const header: Rect = { x: 0, y: 0, w: vw, h: 56 };
    const focus: Rect = { x: 16, y: 564, w: 104, h: 48 };
    // target near the top → sheet at the bottom, above the footer and Focus
    const a = placePopover({ target: { x: 16, y: 80, w: vw - 32, h: 200 }, pop, viewport: vp, obstacles: [header, footer, focus] });
    assert.equal(a.mode, 'sheet');
    assert.equal(a.mode === 'sheet' && a.edge, 'bottom');
    assert.ok(a.y + pop.h <= focus.y, 'above Focus');
    // target is the footer path → sheet at the top, below the header
    const b = placePopover({ target: footer, pop, viewport: vp, obstacles: [header, focus] });
    assert.equal(b.mode === 'sheet' && b.edge, 'top');
    assert.ok(b.y >= header.h);
    assert.ok(b.mode === 'sheet' && b.x >= 0 && b.x + b.w <= vw, 'no horizontal overflow');
    // a tall target (scrolled under the header): the sheet never covers it, even if that means
    // sitting over the dimmed footer/Focus
    const tall: Rect = { x: 16, y: 68, w: vw - 32, h: 400 };
    const c = placePopover({ target: tall, pop, viewport: vp, obstacles: [header, footer, focus] });
    assert.equal(c.mode, 'sheet');
    assert.ok(clear({ x: c.x, y: c.y, w: pop.w, h: pop.h }, tall), 'tall target stays visible');
    assert.ok(c.y + pop.h <= vp.h, 'inside the viewport');
    // physically impossible (target fills the screen): still a card inside the viewport, no crash
    const huge = placePopover({ target: { x: 0, y: 0, w: vw, h: 700 }, pop, viewport: vp, obstacles: [header, footer, focus] });
    assert.ok(huge.y >= 0 && huge.y + pop.h <= vp.h);
  }
});
