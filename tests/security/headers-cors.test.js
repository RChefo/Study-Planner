'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request } = require('../support/http');

let t;
before(async () => {
  t = await startTestApp({ env: { ALLOWED_ORIGINS: 'https://partner.example' } });
});
after(() => t.close());

test('security headers are present on API and page responses', async () => {
  for (const path of ['/api/config', '/api/health']) {
    const { headers } = await request(t.base, path);
    const csp = headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/client/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
    assert.doesNotMatch(csp, /'unsafe-eval'/);
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    assert.match(headers.get('permissions-policy'), /camera=\(\)/);
    assert.equal(headers.get('x-powered-by'), null);
    assert.equal(headers.get('strict-transport-security'), null, 'no HSTS outside production');
  }
});

test('HSTS and upgrade-insecure-requests only in production', async () => {
  const s = await startTestApp({ env: { NODE_ENV: 'production', DISCORD_REDIRECT_URI: 'https://planner.example/api/auth/discord/callback' } });
  try {
    const { headers } = await request(s.base, '/api/health');
    assert.match(headers.get('strict-transport-security'), /max-age=\d+/);
    assert.match(headers.get('content-security-policy'), /upgrade-insecure-requests/);
  } finally {
    await s.close();
  }
});

test('CORS: allowed origin is echoed with credentials; others get nothing; never "*"', async () => {
  const ok = await request(t.base, '/api/config', { headers: { origin: 'https://partner.example' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://partner.example');
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  assert.match(ok.headers.get('vary') || '', /Origin/);
  for (const origin of ['https://evil.example', 'null', 'https://partner.example.evil.com', 'http://partner.example']) {
    const res = await request(t.base, '/api/config', { headers: { origin } });
    assert.equal(res.headers.get('access-control-allow-origin'), null, origin);
  }
});

test('CORS preflight: allowed → 204; disallowed → 403', async () => {
  const ok = await request(t.base, '/api/data', { method: 'OPTIONS', headers: { origin: 'https://partner.example', 'access-control-request-method': 'PUT' } });
  assert.equal(ok.status, 204);
  assert.match(ok.headers.get('access-control-allow-methods'), /PUT/);
  const bad = await request(t.base, '/api/data', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' } });
  assert.equal(bad.status, 403);
});

test('CSRF: state-changing requests from foreign origins are refused even with a valid cookie', async () => {
  const cookie = await t.signIn('csrf');
  const attempts = [
    { headers: { origin: 'https://evil.example' } },
    { headers: { origin: 'null' } },
    { headers: { 'sec-fetch-site': 'cross-site' } },
  ];
  for (const { headers } of attempts) {
    const put = await request(t.base, '/api/data', { method: 'PUT', cookie, headers, body: { data: { courses: [], commitments: [] } } });
    assert.equal(put.status, 403);
    assert.equal(put.json.error.code, 'ORIGIN_NOT_ALLOWED');
    const logout = await request(t.base, '/api/auth/logout-all', { method: 'POST', cookie, headers });
    assert.equal(logout.status, 403);
  }
  assert.equal((await request(t.base, '/api/auth/me', { cookie })).status, 200, 'session untouched');
  // Same-origin and allowed origins pass.
  const same = await request(t.base, '/api/data', { method: 'PUT', cookie, headers: { origin: t.base }, body: { data: { courses: [], commitments: [] } } });
  assert.equal(same.status, 200);
});

test('error responses never leak internals', async () => {
  t.memory.setUnavailable(true);
  try {
    const cookie = 'rafiq_session=x';
    const res = await request(t.base, '/api/data', { cookie });
    for (const r of [res, await request(t.base, '/api/auth/google', { method: 'POST', rawBody: '{bad', headers: { 'content-type': 'application/json' } })]) {
      assert.doesNotMatch(r.text, /mongodb:\/\/|stack|node_modules|at [A-Za-z]+ \(|SESSION_SECRET|test-discord-secret|[A-Z]:\\/);
      assert.ok(r.json.error.code && r.json.error.message);
    }
  } finally {
    t.memory.setUnavailable(false);
  }
});

test('logs never contain session cookies, OAuth codes or secrets', async () => {
  const s = await startTestApp({ logLevel: 'debug' });
  try {
    const cookie = await s.signIn('logs');
    await request(s.base, '/api/data', { cookie });
    await request(s.base, '/api/auth/discord/callback?code=super-secret-code&state=abc');
    s.memory.setUnavailable(true);
    await request(s.base, '/api/data', { cookie });
    const all = JSON.stringify(s.logs);
    assert.ok(s.logs.length > 3);
    assert.ok(!all.includes(cookie.split('=')[1]), 'session token logged');
    assert.ok(!all.includes('super-secret-code'), 'oauth code logged');
    assert.ok(!all.includes('test-discord-secret'));
    assert.ok(!all.includes(s.config.sessionSecret));
  } finally {
    await s.close();
  }
});
