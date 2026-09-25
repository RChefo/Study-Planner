'use strict';

/**
 * Regression tests for crashes and malformed input.
 * FINDING #1 (critical): a malformed `rafiq_oauth_state` cookie on the Discord callback
 * threw outside any try/catch in an async Express 4 handler → unhandled rejection → the
 * whole process exited. Fixed by a non-throwing cookie parser + Express 5 async handling.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request } = require('../support/http');

let t;
before(async () => {
  t = await startTestApp();
});
after(() => t.close());

const MALFORMED_COOKIES = [
  'rafiq_session=%E0%A4%A',
  'rafiq_oauth_state=%E0%A4%A',
  'rafiq_session=%',
  'rafiq_session=a.b.c.d',
  'rafiq_session=' + 'A'.repeat(5000),
  '=;;;=;rafiq_session',
  'rafiq_session=eyJzdWIiOiJ4In0.%ZZ',
  'rafiq_oauth_state=....; rafiq_oauth_state=x',
];

test('malformed cookies never crash the server (critical regression)', async () => {
  const paths = ['/api/auth/me', '/api/data', '/api/files/0123456789abcdef01234567', '/api/auth/discord/callback?code=x&state=y', '/api/auth/discord/start'];
  for (const cookie of MALFORMED_COOKIES) {
    for (const p of paths) {
      const res = await request(t.base, p, { cookie });
      assert.ok([302, 401].includes(res.status), `${p} with ${cookie.slice(0, 30)} → ${res.status}`);
    }
    const logout = await request(t.base, '/api/auth/logout', { method: 'POST', cookie });
    assert.equal(logout.status, 204);
  }
  assert.equal((await request(t.base, '/api/health')).status, 200, 'server still alive');
});

test('malformed JSON → 400 INVALID_JSON without parser details', async () => {
  for (const rawBody of ['{"credential":', '{"a":1}}', "{'a':1}", 'null', '[]', '"str"']) {
    const res = await request(t.base, '/api/auth/google', { method: 'POST', rawBody, headers: { 'content-type': 'application/json' } });
    assert.equal(res.status, 400, rawBody);
    assert.ok(['INVALID_JSON', 'INVALID_REQUEST'].includes(res.json.error.code));
    assert.doesNotMatch(res.text, /Unexpected|SyntaxError|at JSON|node_modules/);
  }
});

test('wrong content type → 415', async () => {
  const res = await request(t.base, '/api/auth/google', { method: 'POST', rawBody: 'credential=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.status, 415);
  assert.equal(res.json.error.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('oversized bodies are rejected before parsing on small endpoints', async () => {
  const big = JSON.stringify({ credential: 'a'.repeat(2 * 1024 * 1024) });
  const started = Date.now();
  const res = await request(t.base, '/api/auth/google', { method: 'POST', rawBody: big, headers: { 'content-type': 'application/json' } });
  assert.equal(res.status, 413);
  assert.equal(res.json.error.code, 'PAYLOAD_TOO_LARGE');
  assert.ok(Date.now() - started < 2000);
});

test('sync body above SYNC_MAX_MB → 413', async () => {
  const s = await startTestApp({ env: { SYNC_MAX_MB: '1' } });
  try {
    const cookie = await s.signIn('big');
    const data = { courses: [], commitments: [{ id: 'k', name: 'x', description: 'y'.repeat(1_200_000) }] };
    const res = await request(s.base, '/api/data', { method: 'PUT', cookie, body: { data } });
    assert.equal(res.status, 413);
  } finally {
    await s.close();
  }
});

test('MongoDB operator objects and wrong types are rejected (no NoSQL injection)', async () => {
  const cookie = await t.signIn('nosql');
  const bodies = [
    { credential: { $gt: '' } },
    { credential: { $ne: null } },
    { credential: ['a'.repeat(20)] },
    { credential: 1e21 },
  ];
  for (const body of bodies) {
    const res = await request(t.base, '/api/auth/google', { method: 'POST', body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  const dataAttacks = [
    { data: { courses: { $where: 'sleep(1000)' }, commitments: [] } },
    { data: { courses: [{ id: { $ne: '' }, name: 'x' }], commitments: [] } },
    { data: { courses: [], commitments: [] }, _id: 'google-victim' },
    { data: { courses: [], commitments: [] }, userId: 'google-victim' },
  ];
  for (const body of dataAttacks) {
    const res = await request(t.base, '/api/data', { method: 'PUT', cookie, body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  // Operator-looking ids in the path are just invalid ids.
  for (const id of ['{"$ne":null}', '%7B%22%24ne%22%3Anull%7D', '000000000000', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
    const res = await request(t.base, `/api/files/${id}`, { cookie });
    assert.equal(res.status, 400, id);
  }
});

test('query-string arrays/objects cannot smuggle values', async () => {
  const res = await request(t.base, '/api/auth/discord/start?next[]=//evil.example&next[$ne]=x');
  assert.equal(res.status, 302);
  const cookie = res.headers.getSetCookie().find(c => c.startsWith('rafiq_oauth_state='));
  const encodedNext = decodeURIComponent(cookie.split('=')[1].split(';')[0]).split('.')[1];
  assert.equal(Buffer.from(encodedNext, 'base64url').toString(), '/app');
});

test('prototype-pollution keys in synced data are stripped', async () => {
  const cookie = await t.signIn('proto');
  const rawBody = '{"data":{"courses":[{"id":"c1","name":"x","topics":[],"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}],"commitments":[]}}';
  const res = await request(t.base, '/api/data', { method: 'PUT', cookie, rawBody, headers: { 'content-type': 'application/json' } });
  assert.equal(res.status, 200);
  assert.equal({}.polluted, undefined);
  const stored = (await request(t.base, '/api/data', { cookie })).json.data.courses[0];
  assert.deepEqual(Object.keys(stored).sort(), ['id', 'name', 'topics']);
});

test('strict envelopes reject unexpected keys; bounded lengths', async () => {
  const extra = await request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'test-google:someone', admin: true } });
  assert.equal(extra.status, 400);
  const cookie = await t.signIn('bounds');
  const tooLong = await request(t.base, '/api/data', { method: 'PUT', cookie, body: { data: { courses: [{ id: 'c', name: 'x'.repeat(201) }], commitments: [] } } });
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.json.error.code, 'INVALID_REQUEST');
  const badDate = await request(t.base, '/api/data', { method: 'PUT', cookie, body: { data: { courses: [], commitments: [{ id: 'k', name: 'x', dueDate: '../../etc' }] } } });
  assert.equal(badDate.status, 400);
});

test('wrong HTTP methods → 405 JSON; unknown API routes → 404 JSON', async () => {
  for (const [method, path] of [
    ['DELETE', '/api/data'],
    ['PATCH', '/api/data'],
    ['GET', '/api/auth/google'],
    ['PUT', '/api/auth/me'],
    ['DELETE', '/api/files/0123456789abcdef01234567'],
    ['POST', '/api/config'],
  ]) {
    const res = await request(t.base, path, { method });
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.json.error.code, 'METHOD_NOT_ALLOWED');
  }
  const res = await request(t.base, '/api/users/google-bob/data');
  assert.equal(res.status, 404);
  assert.equal(res.json.error.code, 'NOT_FOUND');
});

test('concurrent requests: parallel syncs and duplicate uploads stay consistent', async () => {
  const cookie = await t.signIn('concurrent');
  const puts = await Promise.all(
    Array.from({ length: 20 }, (_, i) => request(t.base, '/api/data', { method: 'PUT', cookie, body: { data: { courses: [{ id: `c${i}`, name: `n${i}` }], commitments: [] } } })),
  );
  assert.ok(puts.every(r => r.status === 200));
  const stored = (await request(t.base, '/api/data', { cookie })).json.data;
  assert.equal(stored.courses.length, 1, 'last write wins; never a merged/corrupted document');
  const docs = t.memory.collections.get('plannerData').filter(d => d._id === 'google-concurrent');
  assert.equal(docs.length, 1);
});
