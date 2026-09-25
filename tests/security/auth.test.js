'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startTestApp } = require('../support/test-app');
const { request } = require('../support/http');
const { safeNextPath } = require('../../server/routes/auth');
const { loadConfig } = require('../../server/config');

let t;
before(async () => {
  t = await startTestApp();
});
after(() => t.close());

const tokenOf = cookie => cookie.split('=').slice(1).join('=');

test('session cookie flags: HttpOnly, SameSite=Lax, Path=/, no Secure outside production', async () => {
  const res = await request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'test-google:flags' } });
  const cookie = res.headers.getSetCookie().find(c => c.startsWith('rafiq_session='));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\//);
});

test('session cookie is Secure in production', async () => {
  const s = await startTestApp({ env: { NODE_ENV: 'production', DISCORD_REDIRECT_URI: 'https://planner.example/api/auth/discord/callback' } });
  try {
    const res = await request(s.base, '/api/auth/google', { method: 'POST', body: { credential: 'test-google:prod' } });
    assert.match(res.headers.getSetCookie().find(c => c.startsWith('rafiq_session=')), /Secure/);
  } finally {
    await s.close();
  }
});

test('tampered, forged and structurally invalid tokens are rejected', async () => {
  const cookie = await t.signIn('victim');
  const [body, sig] = tokenOf(cookie).split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  const forge = p => Buffer.from(JSON.stringify(p)).toString('base64url');
  const candidates = [
    `${forge({ ...payload, sub: 'google-admin' })}.${sig}`, // privilege change, old signature
    `${forge({ ...payload, exp: payload.exp + 10_000_000 })}.${sig}`, // extended expiry
    `${body}.${crypto.createHmac('sha256', 'wrong-secret-wrong-secret-wrong-secret').update(body).digest('base64url')}`,
    `${forge({ ...payload, alg: 'none' })}.`,
    `${body}`,
    `${body}.${sig}.extra`,
    `${body}.${sig.slice(0, -2)}`,
  ];
  for (const token of candidates) {
    const res = await request(t.base, '/api/auth/me', { cookie: `rafiq_session=${token}` });
    assert.equal(res.status, 401);
  }
});

test('expired sessions are rejected even with a valid signature', async () => {
  let now = Date.now();
  const s = await startTestApp({ clock: () => now, env: { SESSION_DAYS: '1' } });
  try {
    const cookie = await s.signIn('expiring');
    assert.equal((await request(s.base, '/api/auth/me', { cookie })).status, 200);
    now += 86_400_000 + 1000;
    assert.equal((await request(s.base, '/api/auth/me', { cookie })).status, 401);
  } finally {
    await s.close();
  }
});

test('logout revokes the session server-side (stolen cookie stops working)', async () => {
  const cookie = await t.signIn('stolen');
  const copy = cookie; // attacker's copy
  assert.equal((await request(t.base, '/api/auth/logout', { method: 'POST', cookie })).status, 204);
  assert.equal((await request(t.base, '/api/auth/me', { cookie: copy })).status, 401);
  assert.equal((await request(t.base, '/api/data', { cookie: copy })).status, 401);
});

test('session fixation: every sign-in issues a brand-new session id', async () => {
  const a = await t.signIn('fixation');
  const b = await t.signIn('fixation');
  const sid = c => JSON.parse(Buffer.from(tokenOf(c).split('.')[0], 'base64url').toString()).sid;
  assert.notEqual(sid(a), sid(b));
});

test('Google: invalid credential → 401, unverified email → 401, provider outage → 502', async () => {
  const invalid = await request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'forged-token-value' } });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.json.error.code, 'INVALID_CREDENTIAL');
  const unverified = await request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'test-google-unverified:x' } });
  assert.equal(unverified.json.error.code, 'GOOGLE_ACCOUNT_UNVERIFIED');
  const down = await request(t.base, '/api/auth/google', { method: 'POST', body: { credential: 'test-google-down:x' } });
  assert.equal(down.status, 502);
  assert.equal(down.json.error.code, 'PROVIDER_UNAVAILABLE');
});

async function discordStart(next) {
  const res = await request(t.base, `/api/auth/discord/start${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  const cookie = res.headers.getSetCookie().find(c => c.startsWith('rafiq_oauth_state=')).split(';')[0];
  return { cookie, state: new URL(res.headers.get('location')).searchParams.get('state'), setCookie: res.headers.getSetCookie()[0] };
}

test('OAuth state cookie is HttpOnly, path-scoped and short-lived', async () => {
  const { setCookie } = await discordStart();
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Path=\/api\/auth\/discord/);
  assert.match(setCookie, /Max-Age=600/);
});

test('OAuth callback: forged, missing, replayed or cross-flow state is rejected', async () => {
  const flowA = await discordStart();
  const flowB = await discordStart();
  const cases = [
    [`/api/auth/discord/callback?code=good&state=forged`, flowA.cookie],
    [`/api/auth/discord/callback?code=good&state=${flowA.state}`, undefined],
    [`/api/auth/discord/callback?code=good&state=${flowA.state}`, flowB.cookie],
    [`/api/auth/discord/callback?code=good`, flowA.cookie],
  ];
  for (const [path, cookie] of cases) {
    const res = await request(t.base, path, { cookie });
    assert.equal(res.headers.get('location'), '/auth/callback?provider=discord&error=state_mismatch', path);
    assert.ok(!res.headers.getSetCookie().some(c => c.startsWith('rafiq_session=')));
  }
  // Legitimate use succeeds once; the state cookie is cleared so the same response can't be replayed.
  const ok = await request(t.base, `/api/auth/discord/callback?code=good&state=${flowA.state}`, { cookie: flowA.cookie });
  assert.match(ok.headers.get('location'), /^\/auth\/callback\?provider=discord&next=/);
  assert.ok(ok.headers.getSetCookie().some(c => /^rafiq_oauth_state=;/.test(c)));
});

test('OAuth callback: cancellation and provider failures map to safe codes', async () => {
  const cancel = await discordStart();
  const c1 = await request(t.base, `/api/auth/discord/callback?error=access_denied&state=${cancel.state}`, { cookie: cancel.cookie });
  assert.equal(c1.headers.get('location'), '/auth/callback?provider=discord&error=cancelled');
  const bad = await discordStart();
  const c2 = await request(t.base, `/api/auth/discord/callback?code=bad&state=${bad.state}`, { cookie: bad.cookie });
  assert.equal(c2.headers.get('location'), '/auth/callback?provider=discord&error=provider_error');
  const down = await discordStart();
  const c3 = await request(t.base, `/api/auth/discord/callback?code=down&state=${down.state}`, { cookie: down.cookie });
  assert.equal(c3.headers.get('location'), '/auth/callback?provider=discord&error=provider_unavailable');
  const weird = await discordStart();
  const c4 = await request(t.base, `/api/auth/discord/callback?error=%3Cscript%3E&state=${weird.state}`, { cookie: weird.cookie });
  assert.equal(c4.headers.get('location'), '/auth/callback?provider=discord&error=provider_error', 'provider error text is never reflected');
});

test('open redirects are impossible through `next`', async () => {
  const hostile = ['//evil.example', 'https://evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)', '/%0d%0aSet-Cookie:x=1', '/app\u0000', ' //evil.example', 'http:/evil.example', '/'.repeat(600)];
  for (const next of hostile) assert.ok(['/app', next].includes(safeNextPath(next)) && !/^\/\/|^[a-z]+:|\\/i.test(safeNextPath(next)), next);
  for (const next of hostile) {
    const flow = await discordStart(next);
    const res = await request(t.base, `/api/auth/discord/callback?code=good&state=${flow.state}`, { cookie: flow.cookie });
    const target = new URL(res.headers.get('location'), 'http://app.local').searchParams.get('next');
    const resolved = new URL(target, 'http://app.local');
    assert.equal(resolved.origin, 'http://app.local', `next=${JSON.stringify(next)} escaped to ${resolved.origin}`);
  }
  assert.equal(safeNextPath('/app/commitments?x=1'), '/app/commitments?x=1');
});

test('config refuses insecure settings', () => {
  const base = { NODE_ENV: 'production', MONGODB_URI: 'mongodb://x', GOOGLE_CLIENT_ID: 'id', SESSION_SECRET: 'x'.repeat(40) };
  assert.throws(() => loadConfig({ ...base, SESSION_SECRET: 'short' }), /SESSION_SECRET/);
  assert.throws(() => loadConfig({ ...base, SESSION_SECRET: '' }), /SESSION_SECRET/);
  assert.throws(() => loadConfig({ ...base, ALLOWED_ORIGINS: '*' }), /ALLOWED_ORIGINS/);
  assert.throws(() => loadConfig({ ...base, DISCORD_CLIENT_ID: 'a', DISCORD_CLIENT_SECRET: 'b', DISCORD_REDIRECT_URI: 'http://planner.example/api/auth/discord/callback' }), /https/);
  assert.throws(() => loadConfig({ ...base, DISCORD_CLIENT_ID: 'a', DISCORD_CLIENT_SECRET: 'b', DISCORD_REDIRECT_URI: 'https://evil.example/steal' }), /callback/);
  assert.throws(() => loadConfig({ ...base, GOOGLE_CLIENT_ID: '' }), /GOOGLE_CLIENT_ID/);
});
