'use strict';

/** Degradation: database outages, slow database, provider outages, aborted requests. */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { startTestApp } = require('../support/test-app');
const { request } = require('../support/http');

let t;
before(async () => {
  t = await startTestApp();
});
after(() => t.close());

test('database unavailable → 503 DATABASE_UNAVAILABLE, liveness stays up, readiness reports it, recovery is automatic', async () => {
  const cookie = await t.signIn('outage');
  t.memory.setUnavailable(true);
  try {
    for (const [method, path, body] of [
      ['GET', '/api/data'],
      ['PUT', '/api/data', { data: { courses: [], commitments: [] } }],
      ['GET', '/api/auth/me'],
      ['POST', '/api/auth/google', { credential: 'test-google:outage' }],
    ]) {
      const res = await request(t.base, path, { method, cookie, body });
      assert.equal(res.status, 503, `${method} ${path}`);
      assert.equal(res.json.error.code, 'DATABASE_UNAVAILABLE');
    }
    assert.equal((await request(t.base, '/api/health')).status, 200);
    const ready = await request(t.base, '/api/health/ready');
    assert.equal(ready.status, 503);
    assert.deepEqual(ready.json, { status: 'unavailable' });
  } finally {
    t.memory.setUnavailable(false);
  }
  assert.equal((await request(t.base, '/api/data', { cookie })).status, 200, 'recovers without restart');
});

test('file download that fails mid-stream ends the response instead of hanging or crashing', async () => {
  const cookie = await t.signIn('stream');
  const { PDF_BYTES, dataUrl } = require('../support/http');
  const up = await request(t.base, '/api/files', { method: 'POST', cookie, body: { data: dataUrl('application/pdf', PDF_BYTES), name: 'x.pdf' } });
  // Metadata lookup succeeds, then the blob stream errors.
  const bucket = t.memory.bucket;
  const original = bucket.openDownloadStream;
  bucket.openDownloadStream = () => {
    const { Readable } = require('node:stream');
    const r = new Readable({ read() {} });
    setImmediate(() => r.destroy(Object.assign(new Error('socket closed'), { name: 'MongoNetworkError' })));
    return r;
  };
  try {
    const outcome = await fetch(`${t.base}/api/files/${up.json.id}`, { headers: { cookie } })
      .then(async r => (r.ok ? r.arrayBuffer().then(() => 'body', () => 'aborted') : `status ${r.status}`))
      .catch(() => 'aborted');
    assert.ok(['aborted', 'status 503'].includes(outcome), outcome);
  } finally {
    bucket.openDownloadStream = original;
  }
  assert.equal((await request(t.base, '/api/health')).status, 200);
});

test('slow database does not block unrelated requests', async () => {
  const cookie = await t.signIn('slow');
  t.memory.setDelay(300);
  try {
    const slow = request(t.base, '/api/data', { cookie });
    const started = Date.now();
    assert.equal((await request(t.base, '/api/health')).status, 200);
    assert.ok(Date.now() - started < 200, 'liveness answered while DB was slow');
    assert.equal((await slow).status, 200);
  } finally {
    t.memory.setDelay(0);
  }
});

test('client disconnecting mid-upload does not crash the server', async () => {
  const cookie = await t.signIn('abort');
  const { port } = new URL(t.base);
  await new Promise(resolve => {
    const socket = net.connect(Number(port), '127.0.0.1', () => {
      socket.write(`POST /api/files HTTP/1.1\r\nHost: 127.0.0.1\r\nCookie: ${cookie}\r\nContent-Type: application/json\r\nContent-Length: 100000\r\n\r\n{"data":"data:application/pdf;base64,JVBER`);
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, 50);
    });
  });
  await new Promise(r => setTimeout(r, 50));
  assert.equal((await request(t.base, '/api/health')).status, 200);
});

test('garbage on the wire is rejected at the HTTP layer without crashing', async () => {
  const { port } = new URL(t.base);
  for (const payload of ['GARBAGE\r\n\r\n', 'GET / HTTP/1.1\r\nHost: x\r\nContent-Length: -1\r\n\r\n', `GET /${'a'.repeat(20000)} HTTP/1.1\r\nHost: x\r\n\r\n`]) {
    await new Promise(resolve => {
      const socket = net.connect(Number(port), '127.0.0.1', () => socket.write(payload));
      socket.on('data', () => socket.destroy());
      socket.on('close', resolve);
      socket.on('error', resolve);
      setTimeout(() => socket.destroy(), 500);
    });
  }
  assert.equal((await request(t.base, '/api/health')).status, 200);
});
