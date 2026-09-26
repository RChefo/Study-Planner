'use strict';

/**
 * Local mock API: the real Express app with an in-memory database and fake sign-in
 * providers, for UI development and load testing without MongoDB/Google/Discord.
 *
 *   npm run dev:mock-api        → http://localhost:3000 (Vite on :5173 proxies /api here)
 *
 * Sign in from the browser console on the app origin:
 *   fetch('/api/auth/google', {method:'POST', headers:{'Content-Type':'application/json'},
 *         body: JSON.stringify({credential:'test-google:alice'})})
 *
 * Refuses to start with NODE_ENV=production. Data is lost on exit.
 */

const path = require('node:path');
const { startTestApp } = require('./test-app');

if (process.env.NODE_ENV === 'production') {
  process.stderr.write('mock-server is a development tool and refuses to run with NODE_ENV=production\n');
  process.exit(1);
}

(async () => {
  const port = Number(process.env.MOCK_PORT || 3000);
  const env = {};
  for (const key of Object.keys(process.env)) if (/RATE_LIMIT|_MAX$|MAX_UPLOAD_MB|QUOTA/.test(key)) env[key] = process.env[key];
  const t = await startTestApp({
    env,
    clientDir: process.env.MOCK_SERVE_DIST ? path.join(__dirname, '..', '..', 'dist') : null,
    logLevel: process.env.LOG_LEVEL || 'warn',
    port,
  });
  process.stdout.write(`mock API listening on ${t.base}\n`);
  if (process.send) process.send({ type: 'ready', base: t.base });
  // Resource stats for the load tester (IPC only; never exposed over HTTP).
  process.on('message', msg => {
    if (msg?.type !== 'stats') return;
    // Full GC on request (load-test leak check; only available with --expose-gc).
    if (msg.gc && typeof global.gc === 'function') global.gc();
    process.send({ type: 'stats', memory: process.memoryUsage(), cpu: process.cpuUsage(), uptime: process.uptime() });
  });
  const stop = () => t.close().then(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
