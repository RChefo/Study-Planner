'use strict';

const crypto = require('node:crypto');
const { loadConfig } = require('../../server/config');
const { createLogger } = require('../../server/logger');
const { createApp } = require('../../server/app');
const { createDiscordClient } = require('../../server/providers');
const { AppError } = require('../../server/errors');
const { createMemoryDb } = require('./memory-db');

/**
 * Starts the real Express app on an ephemeral port with an in-memory database and fake
 * identity providers:
 *   Google credential  "test-google:<name>"            → verified account `google-<name>`
 *                      "test-google-unverified:<name>" → unverified email
 *                      "test-google-down:x"            → provider outage
 *   Discord code       "good" → profile, "bad" → rejected, "down" → provider outage
 */
function fakeGoogleVerifier(credential) {
  const [kind, name = 'user'] = credential.split(':');
  if (kind === 'test-google-down') return Promise.reject(new AppError('PROVIDER_UNAVAILABLE'));
  if (kind !== 'test-google' && kind !== 'test-google-unverified') return Promise.reject(new AppError('INVALID_CREDENTIAL'));
  return Promise.resolve({ sub: `google-${name}`, email: `${name}@example.test`, email_verified: kind === 'test-google', name: `Test ${name}`, picture: '' });
}

function fakeDiscordFetch(url, init = {}) {
  if (url === 'https://discord.com/api/oauth2/token') {
    const code = new URLSearchParams(String(init.body)).get('code');
    if (code === 'down') return Promise.resolve(new Response('{}', { status: 503 }));
    if (code !== 'good') return Promise.resolve(Response.json({ error: 'invalid_grant' }, { status: 400 }));
    return Promise.resolve(Response.json({ access_token: 'fake-access-token', token_type: 'Bearer' }));
  }
  if (url === 'https://discord.com/api/users/@me') {
    return Promise.resolve(Response.json({ id: '112233445566778899', username: 'bob', global_name: 'Bob', avatar: null, email: 'bob@example.test', verified: true }));
  }
  return Promise.reject(new Error(`unexpected fetch ${url}`));
}

function testConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '3999',
    MONGODB_URI: 'mongodb://memory',
    SESSION_SECRET: crypto.randomBytes(48).toString('base64url'),
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    DISCORD_CLIENT_ID: 'test-discord-client',
    DISCORD_CLIENT_SECRET: 'test-discord-secret',
    DISCORD_REDIRECT_URI: 'http://localhost:5173/api/auth/discord/callback',
    // Generous by default so functional tests aren't throttled; rate-limit tests override.
    RATE_LIMIT_MAX_REQUESTS: '100000',
    AUTH_RATE_LIMIT_MAX: '100000',
    OAUTH_CALLBACK_RATE_LIMIT_MAX: '100000',
    UPLOAD_RATE_LIMIT_MAX: '100000',
    SYNC_RATE_LIMIT_MAX: '100000',
    MAX_UPLOAD_MB: '2',
    ...overrides,
  });
}

async function startTestApp({ env = {}, clientDir = null, logLevel = 'silent', clock, port = 0 } = {}) {
  const config = testConfig(env);
  const memory = createMemoryDb();
  const logs = [];
  const logger = createLogger({ level: logLevel, stream: { write: line => (port ? process.stdout.write(line) : logs.push(JSON.parse(line))) } });
  const app = createApp({
    config,
    db: memory.db,
    bucket: memory.bucket,
    logger,
    googleVerifier: fakeGoogleVerifier,
    discordClient: createDiscordClient({ discord: config.discord, timeoutMs: 2000, fetchImpl: fakeDiscordFetch }),
    clientDir,
    isReady: async () => !memory.state.unavailable,
    clock,
  });
  const server = await new Promise(resolve => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Signs in through the real Google route and returns the session cookie header value. */
  async function signIn(name = 'alice') {
    const res = await fetch(`${base}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: `test-google:${name}` }),
    });
    if (res.status !== 200) throw new Error(`sign-in failed: ${res.status}`);
    return res.headers.getSetCookie().find(c => c.startsWith('rafiq_session=')).split(';')[0];
  }

  const close = () => new Promise(resolve => server.close(resolve));
  return { base, config, memory, logs, signIn, close, server };
}

module.exports = { startTestApp, testConfig, fakeGoogleVerifier, fakeDiscordFetch };
