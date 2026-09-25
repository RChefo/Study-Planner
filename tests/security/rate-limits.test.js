'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request, dataUrl } = require('../support/http');

async function hammer(n, fn) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(await fn(i));
  return results;
}

test('auth endpoints: strict per-IP limit → 429 with Retry-After and JSON body', async () => {
  const t = await startTestApp({ env: { AUTH_RATE_LIMIT_MAX: '5', AUTH_RATE_LIMIT_WINDOW_MS: '60000' } });
  try {
    const res = await hammer(8, () => request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'wrong-credential' } }));
    assert.deepEqual(res.map(r => r.status), [401, 401, 401, 401, 401, 429, 429, 429]);
    const limited = res[5];
    assert.equal(limited.json.error.code, 'RATE_LIMITED');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.match(limited.headers.get('ratelimit-policy'), /auth/);
    // Discord start shares the auth bucket.
    assert.equal((await request(t.base, '/api/auth/discord/start')).status, 429);
  } finally {
    await t.close();
  }
});

test('OAuth callback has its own strict limit', async () => {
  const t = await startTestApp({ env: { OAUTH_CALLBACK_RATE_LIMIT_MAX: '3' } });
  try {
    const res = await hammer(5, () => request(t.base, '/api/auth/discord/callback?code=x&state=y'));
    assert.deepEqual(res.map(r => r.status), [302, 302, 302, 429, 429]);
  } finally {
    await t.close();
  }
});

test('uploads and sync are limited per user, independently of other users', async () => {
  const t = await startTestApp({ env: { UPLOAD_RATE_LIMIT_MAX: '2', SYNC_RATE_LIMIT_MAX: '3' } });
  try {
    const a = await t.signIn('a');
    const b = await t.signIn('b');
    const up = (c, i) => request(t.base, '/api/files', { method: 'POST', cookie: c, body: { data: dataUrl('application/pdf', Buffer.from(`%PDF-${i}`)), name: 'x.pdf' } });
    assert.deepEqual((await hammer(3, i => up(a, i))).map(r => r.status), [201, 201, 429]);
    assert.equal((await up(b, 9)).status, 201, 'another user is not affected');
    const put = c => request(t.base, '/api/data', { method: 'PUT', cookie: c, body: { data: { courses: [], commitments: [] } } });
    assert.deepEqual((await hammer(4, () => put(a))).map(r => r.status), [200, 200, 200, 429]);
    assert.equal((await put(b)).status, 200);
  } finally {
    await t.close();
  }
});

test('general API limit applies to everything under /api except liveness', async () => {
  const t = await startTestApp({ env: { RATE_LIMIT_MAX_REQUESTS: '10' } });
  try {
    const res = await hammer(12, () => request(t.base, '/api/config'));
    assert.equal(res.filter(r => r.status === 429).length, 2);
    assert.equal((await request(t.base, '/api/health')).status, 200, 'liveness is never throttled');
    assert.equal((await request(t.base, '/api/health/ready')).status, 429, 'readiness (DB ping) is throttled');
  } finally {
    await t.close();
  }
});

test('X-Forwarded-For cannot be used to dodge limits unless TRUST_PROXY is configured', async () => {
  const t = await startTestApp({ env: { AUTH_RATE_LIMIT_MAX: '3' } });
  try {
    const res = await hammer(5, i => request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'wrong-credential' }, headers: { 'x-forwarded-for': `203.0.113.${i}` } }));
    assert.deepEqual(res.map(r => r.status), [401, 401, 401, 429, 429]);
  } finally {
    await t.close();
  }
});

test('with TRUST_PROXY=1 the forwarded client address is used (behind a real proxy)', async () => {
  const t = await startTestApp({ env: { AUTH_RATE_LIMIT_MAX: '2', TRUST_PROXY: '1' } });
  try {
    const call = ip => request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'wrong-credential' }, headers: { 'x-forwarded-for': ip } });
    assert.deepEqual([await call('198.51.100.1'), await call('198.51.100.1'), await call('198.51.100.1')].map(r => r.status), [401, 401, 429]);
    assert.equal((await call('198.51.100.2')).status, 401, 'different client behind the proxy has its own bucket');
  } finally {
    await t.close();
  }
});

test('burst of concurrent requests does not break the limiter or the server', async () => {
  const t = await startTestApp({ env: { RATE_LIMIT_MAX_REQUESTS: '50' } });
  try {
    const res = await Promise.all(Array.from({ length: 120 }, () => request(t.base, '/api/config')));
    assert.equal(res.filter(r => r.status === 200).length, 50);
    assert.equal(res.filter(r => r.status === 429).length, 70);
    assert.equal((await request(t.base, '/api/health')).status, 200);
  } finally {
    await t.close();
  }
});
