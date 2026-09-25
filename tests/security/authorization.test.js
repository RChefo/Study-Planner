'use strict';

/**
 * IDOR / BOLA: a signed-in user must never read or reference another user's data or files.
 * Data routes take no user id at all (the session decides); files are looked up by
 * (id AND owner) and "not yours" is indistinguishable from "does not exist".
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request, PDF_BYTES, dataUrl, plannerWithFile } = require('../support/http');

let t;
let alice;
let bob;
let aliceFile;
before(async () => {
  t = await startTestApp();
  alice = await t.signIn('alice');
  bob = await t.signIn('bob');
  const up = await request(t.base, '/api/files', { method: 'POST', cookie: alice, body: { data: dataUrl('application/pdf', PDF_BYTES), name: 'secret.pdf' } });
  aliceFile = up.json;
  await request(t.base, '/api/data', { method: 'PUT', cookie: alice, body: { data: { ...plannerWithFile(aliceFile.id, aliceFile.sha256), commitments: [{ id: 'k', name: 'alice-private' }] } } });
});
after(() => t.close());

test('unauthenticated requests to protected routes → 401', async () => {
  for (const [method, path] of [
    ['GET', '/api/data'],
    ['PUT', '/api/data'],
    ['POST', '/api/files'],
    ['GET', `/api/files/${'a'.repeat(24)}`],
    ['GET', '/api/auth/me'],
    ['POST', '/api/auth/logout-all'],
  ]) {
    const res = await request(t.base, path, { method, body: method === 'GET' ? undefined : {} });
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.equal(res.json.error.code, 'UNAUTHENTICATED');
  }
});

test("user B cannot download user A's file (same response as a missing file)", async () => {
  const theirs = await request(t.base, `/api/files/${aliceFile.id}`, { cookie: bob });
  const missing = await request(t.base, `/api/files/${'f'.repeat(24)}`, { cookie: bob });
  assert.equal(theirs.status, 404);
  assert.deepEqual({ ...theirs.json.error, requestId: 0 }, { ...missing.json.error, requestId: 0 });
  assert.equal((await request(t.base, `/api/files/${aliceFile.id}`, { cookie: alice })).status, 200);
});

test("user B cannot attach user A's file id to their own data", async () => {
  const res = await request(t.base, '/api/data', { method: 'PUT', cookie: bob, body: { data: plannerWithFile(aliceFile.id, aliceFile.sha256) } });
  assert.equal(res.status, 409);
  assert.equal(res.json.error.code, 'FILES_MISSING');
  assert.deepEqual(res.json.error.details.missing, [aliceFile.id]);
});

test("user B's data reads/writes never touch user A's document", async () => {
  assert.equal((await request(t.base, '/api/data', { cookie: bob })).json.data, null);
  await request(t.base, '/api/data', { method: 'PUT', cookie: bob, body: { data: { courses: [], commitments: [{ id: 'k', name: 'bob' }] } } });
  const aliceData = (await request(t.base, '/api/data', { cookie: alice })).json.data;
  assert.equal(aliceData.commitments[0].name, 'alice-private');
  // Attempts to name another user in the body or query are ignored/rejected.
  const smuggle = await request(t.base, '/api/data?userId=google-alice&_id=google-alice', { cookie: bob });
  assert.equal(smuggle.json.data.commitments[0].name, 'bob');
});

test("upload de-duplication is per user (no cross-user hash oracle)", async () => {
  const res = await request(t.base, '/api/files', { method: 'POST', cookie: bob, body: { data: dataUrl('application/pdf', PDF_BYTES), name: 'same-bytes.pdf' } });
  assert.equal(res.status, 201, 'bob gets his own copy, not a pointer to alice’s');
  assert.notEqual(res.json.id, aliceFile.id);
});

test('logout-all by B does not affect A', async () => {
  const bob2 = await t.signIn('bob');
  await request(t.base, '/api/auth/logout-all', { method: 'POST', cookie: bob2 });
  assert.equal((await request(t.base, '/api/auth/me', { cookie: alice })).status, 200);
});
