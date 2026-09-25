'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startTestApp } = require('./support/test-app');
const { request, PDF_BYTES, dataUrl, plannerWithFile } = require('./support/http');

let t;
before(async () => {
  t = await startTestApp();
});
after(() => t.close());

test('health and readiness', async () => {
  assert.deepEqual((await request(t.base, '/api/health')).json, { status: 'ok' });
  assert.deepEqual((await request(t.base, '/api/health/ready')).json, { status: 'ready' });
});

test('config exposes only public provider settings', async () => {
  const { json } = await request(t.base, '/api/config');
  assert.deepEqual(Object.keys(json).sort(), ['discordEnabled', 'googleClientId']);
  assert.ok(!JSON.stringify(json).includes('test-discord-secret'));
});

test('Google sign-in → me → data round trip', async () => {
  const cookie = await t.signIn('roundtrip');
  const me = await request(t.base, '/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.sub, 'google-roundtrip');
  assert.equal(me.json.user.provider, 'google');

  const data = {
    courses: [{ id: 'c1', name: 'شبكات', topics: [{ name: 'L1', done: true }] }],
    commitments: [{ id: 'k1', name: 'Report', dueDate: '2026-10-05', description: 'TCP', done: false }],
    studyLog: [{ id: 's1', subject: 'شبكات', topic: 'L1', startedAt: 1, endedAt: 2, duration: 25, completed: true, sessionId: null }],
    sessions: [],
    timetable: null,
    timerSettings: { focus: 25, shortBreak: 5, longBreak: 15, cycles: 4 },
    preferences: { dailyGoalMinutes: 120 },
  };
  const put = await request(t.base, '/api/data', { method: 'PUT', cookie, body: { data } });
  assert.equal(put.status, 200);
  const got = await request(t.base, '/api/data', { cookie });
  assert.equal(got.json.data.courses[0].name, 'شبكات');
  assert.equal(got.json.data.preferences.dailyGoalMinutes, 120);
  assert.equal(got.headers.get('cache-control'), 'no-store');
});

test('legacy-shaped data (missing optional fields) is accepted', async () => {
  const cookie = await t.signIn('legacy');
  const data = {
    courses: [{ id: 'c1', name: 'Java', topics: [{ name: 'Vars' }] }],
    commitments: [{ id: 'k1', name: 'HW' }],
    sessions: [{ id: 's1', course: 'c1', topic: 'Loops', date: '2026-01-01', time: '19:00', duration: 50, priority: 'عالية', study: '', prev: '', next: '', status: 'moved' }],
  };
  const put = await request(t.base, '/api/data', { method: 'PUT', cookie, body: { data } });
  assert.equal(put.status, 200, put.text);
});

test('file upload, de-duplication and download', async () => {
  const cookie = await t.signIn('files');
  const up = await request(t.base, '/api/files', { method: 'POST', cookie, body: { data: dataUrl('application/pdf', PDF_BYTES), name: 'lecture.pdf' } });
  assert.equal(up.status, 201);
  assert.match(up.json.id, /^[a-f\d]{24}$/);
  const again = await request(t.base, '/api/files', { method: 'POST', cookie, body: { data: dataUrl('application/pdf', PDF_BYTES), name: 'copy.pdf' } });
  assert.equal(again.status, 200);
  assert.equal(again.json.id, up.json.id);

  const res = await fetch(`${t.base}/api/files/${up.json.id}`, { headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF_BYTES);

  const put = await request(t.base, '/api/data', { method: 'PUT', cookie, body: { data: plannerWithFile(up.json.id, up.json.sha256) } });
  assert.equal(put.status, 200);
});

test('Discord sign-in flow sets a session and redirects to the app', async () => {
  const start = await request(t.base, '/api/auth/discord/start?next=%2Fapp%2Fstudy-log');
  assert.equal(start.status, 302);
  const location = new URL(start.headers.get('location'));
  assert.equal(location.origin, 'https://discord.com');
  assert.equal(location.searchParams.get('client_id'), 'test-discord-client');
  assert.ok(!start.headers.get('location').includes('test-discord-secret'));
  const stateCookie = start.headers.getSetCookie().find(c => c.startsWith('rafiq_oauth_state=')).split(';')[0];
  const state = location.searchParams.get('state');

  const cb = await request(t.base, `/api/auth/discord/callback?code=good&state=${state}`, { cookie: stateCookie });
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get('location'), '/auth/callback?provider=discord&next=%2Fapp%2Fstudy-log');
  const session = cb.headers.getSetCookie().find(c => c.startsWith('rafiq_session=')).split(';')[0];
  const me = await request(t.base, '/api/auth/me', { cookie: session });
  assert.equal(me.json.user.sub, 'discord:112233445566778899');
  assert.equal(me.json.user.provider, 'discord');
});

test('logout-all revokes every session of the user', async () => {
  const a = await t.signIn('multi');
  const b = await t.signIn('multi');
  assert.notEqual(a, b, 'each sign-in gets a fresh session id');
  assert.equal((await request(t.base, '/api/auth/logout-all', { method: 'POST', cookie: a })).status, 204);
  assert.equal((await request(t.base, '/api/auth/me', { cookie: a })).status, 401);
  assert.equal((await request(t.base, '/api/auth/me', { cookie: b })).status, 401);
});

test('serves the built frontend with correct caching and SPA fallback', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Study Planner</title>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
  const s = await startTestApp({ clientDir: dir });
  try {
    const page = await request(s.base, '/app/courses');
    assert.equal(page.status, 200);
    assert.match(page.text, /Study Planner/);
    assert.equal(page.headers.get('cache-control'), 'no-cache');
    const asset = await request(s.base, '/assets/app-abc123.js');
    assert.match(asset.headers.get('cache-control'), /immutable/);
    const api404 = await request(s.base, '/api/nope');
    assert.equal(api404.status, 404);
    assert.equal(api404.json.error.code, 'NOT_FOUND');
  } finally {
    await s.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
