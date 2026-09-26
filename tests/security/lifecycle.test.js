'use strict';

/** Entry-point reliability: graceful shutdown with in-flight requests, and safe startup failures. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { fork, spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const baseEnv = {
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'info',
  MONGODB_URI: 'mongodb://memory',
  SESSION_SECRET: crypto.randomBytes(48).toString('base64url'),
  GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  DISCORD_CLIENT_ID: '',
};

function waitFor(child, predicate, ms = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for child')), ms);
    const onMsg = msg => {
      if (!predicate(msg)) return;
      clearTimeout(timer);
      child.off('message', onMsg);
      resolve(msg);
    };
    child.on('message', onMsg);
  });
}

async function waitForHttp(url, ms = 10_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server did not start');
}

test('SIGTERM: in-flight requests finish, new connections are refused, DB is closed, exit code 0', async () => {
  const port = 3290;
  const child = fork(path.join(__dirname, '..', 'support', 'entry-harness.js'), [], {
    cwd: ROOT,
    env: { ...baseEnv, PORT: String(port), HARNESS_DB_DELAY_MS: '800' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  child.stdout.on('data', d => (output += d));
  child.stderr.on('data', d => (output += d));
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForHttp(`${base}/api/health`);
    // A request genuinely in flight: readiness pings the (800 ms) database when SIGTERM arrives.
    const inFlight = fetch(`${base}/api/health/ready`).then(r => r.status);
    await new Promise(r => setTimeout(r, 50));
    const exit = waitFor(child, m => m?.type === 'exit');
    child.send({ type: 'signal', name: 'SIGTERM' });
    assert.ok([200, 503].includes(await inFlight), 'in-flight request completed with a response');
    const result = await exit;
    assert.equal(result.code, 0);
    assert.equal(result.dbClosed, true, 'database connection closed');
    await assert.rejects(fetch(`${base}/api/health`), 'new connections are refused after shutdown');
    assert.match(output, /"msg":"shutting down"/);
    assert.match(output, /"msg":"shutdown complete"/);
  } finally {
    child.kill();
  }
});

test('startup with an unreachable database fails fast with a safe message (no credentials)', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...baseEnv, PORT: '3291', MONGODB_URI: 'mongodb://admin:TopSecretPw123@127.0.0.1:1/x?serverSelectionTimeoutMS=500&connectTimeoutMS=500' },
  });
  let stderr = '';
  child.stderr.on('data', d => (stderr += d));
  const code = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(code, 1);
  assert.match(stderr, /^Startup failed:/);
  assert.doesNotMatch(stderr, /TopSecretPw123|admin:/);
});

test('startup refuses insecure or incomplete configuration', async () => {
  for (const [env, pattern] of [
    [{ SESSION_SECRET: 'short' }, /SESSION_SECRET/],
    [{ GOOGLE_CLIENT_ID: '' }, /GOOGLE_CLIENT_ID/],
    [{ ALLOWED_ORIGINS: '*' }, /ALLOWED_ORIGINS/],
  ]) {
    const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...baseEnv, PORT: '3292', ...env } });
    let stderr = '';
    child.stderr.on('data', d => (stderr += d));
    const code = await new Promise(resolve => child.on('exit', resolve));
    assert.equal(code, 1, JSON.stringify(env));
    assert.match(stderr, pattern);
  }
});
