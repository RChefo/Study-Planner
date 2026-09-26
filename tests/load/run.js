'use strict';

/**
 * Local load test — NEVER point this at production or third-party hosts.
 *
 * Starts the real app (mock-server: in-memory MongoDB + fake identity providers) in a child
 * process, drives it with autocannon at 10/25/50/100 concurrent connections, and reports
 * requests/sec, average/p95/p99 latency, error and 429 rates, peak memory and CPU, and
 * whether the server crashed.
 *
 *   npm run load:test                 # full run (~2 minutes)
 *   LOAD_DURATION=5 npm run load:test # shorter
 *
 * Note: the in-memory database answers in microseconds, so these numbers measure the Node/
 * Express layer (parsing, validation, sessions, rate limiting), not MongoDB Atlas latency.
 */

const path = require('node:path');
const { fork } = require('node:child_process');
const autocannon = require('autocannon');

const DURATION = Number(process.env.LOAD_DURATION || 8);
const PORT = Number(process.env.LOAD_PORT || 3190);
const BASE = `http://127.0.0.1:${PORT}`;

function startServer(env) {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, '..', 'support', 'mock-server.js'), [], {
      env: { ...process.env, NODE_ENV: 'test', MOCK_PORT: String(PORT), LOG_LEVEL: 'error', ...env },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      execArgv: ['--expose-gc'],
    });
    child.crashed = false;
    child.once('exit', code => {
      if (!child.stopping) child.crashed = code;
    });
    child.on('message', msg => msg?.type === 'ready' && resolve(child));
    child.once('error', reject);
    setTimeout(() => reject(new Error('server did not start')), 15_000);
  });
}

function stopServer(child) {
  child.stopping = true;
  return new Promise(resolve => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  });
}

function sampleStats(child, { gc = false } = {}) {
  return new Promise(resolve => {
    const onMsg = msg => {
      if (msg?.type !== 'stats') return;
      child.off('message', onMsg);
      resolve(msg);
    };
    child.on('message', onMsg);
    child.send({ type: 'stats', gc });
    setTimeout(() => resolve(null), 1000);
  });
}

async function signInMany(n) {
  const cookies = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch(`${BASE}/api/auth/google`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential: `test-google:load${i}` }) });
    cookies.push(res.headers.getSetCookie().find(c => c.startsWith('rafiq_session=')).split(';')[0]);
  }
  return cookies;
}

/** Realistic planner document (~60 KB): 6 courses × 12 lectures, 40 commitments, 400 log entries. */
function plannerPayload() {
  const courses = Array.from({ length: 6 }, (_, c) => ({ id: `c${c}`, name: `مادة ${c}`, topics: Array.from({ length: 12 }, (_, t) => ({ name: `المحاضرة ${t} — موضوع تجريبي`, done: t % 3 === 0 })) }));
  const commitments = Array.from({ length: 40 }, (_, i) => ({ id: `k${i}`, name: `التزام ${i}`, dueDate: '2026-10-10', description: 'وصف قصير للمطلوب في هذا الالتزام', done: i % 4 === 0 }));
  const studyLog = Array.from({ length: 400 }, (_, i) => ({ id: `l${i}`, subject: `مادة ${i % 6}`, topic: `المحاضرة ${i % 12}`, startedAt: 1.79e12 + i * 3.6e6, endedAt: 1.79e12 + i * 3.6e6 + 1.5e6, duration: 25, completed: true, sessionId: null }));
  return JSON.stringify({ data: { courses, commitments, studyLog, sessions: [], timetable: null } });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function run(child, { name, connections, requests, cookies }) {
  const latencies = [];
  const statuses = {};
  let peakRss = 0;
  let peakHeap = 0;
  const cpuStart = await sampleStats(child);
  const wallStart = process.hrtime.bigint();
  const poll = setInterval(async () => {
    const s = await sampleStats(child);
    if (s) {
      peakRss = Math.max(peakRss, s.memory.rss);
      peakHeap = Math.max(peakHeap, s.memory.heapUsed);
    }
  }, 500);

  let nextUser = 0;
  const instance = autocannon({
    url: BASE,
    connections,
    duration: DURATION,
    requests,
    // Give each connection its own signed-in user (realistic: many users, one session each).
    setupClient: cookies ? client => client.setHeaders({ cookie: cookies[nextUser++ % cookies.length], 'content-type': 'application/json' }) : undefined,
  });
  instance.on('reqError', () => (statuses.network = (statuses.network || 0) + 1));
  instance.on('response', (_client, statusCode, _bytes, responseTime) => {
    latencies.push(responseTime);
    statuses[statusCode] = (statuses[statusCode] || 0) + 1;
  });
  const result = await instance;
  clearInterval(poll);
  const cpuEnd = await sampleStats(child);
  const wallMs = Number(process.hrtime.bigint() - wallStart) / 1e6;
  const cpuMs = cpuStart && cpuEnd ? (cpuEnd.cpu.user + cpuEnd.cpu.system - cpuStart.cpu.user - cpuStart.cpu.system) / 1000 : 0;

  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  const errors5xx = Object.entries(statuses).filter(([k]) => /^5/.test(k)).reduce((n, [, v]) => n + v, 0);
  return {
    name,
    connections,
    requests: total,
    rps: Math.round(result.requests.average),
    avg: Math.round((latencies.reduce((a, b) => a + b, 0) / (total || 1)) * 10) / 10,
    p95: Math.round(percentile(latencies, 95) * 10) / 10,
    p99: Math.round(percentile(latencies, 99) * 10) / 10,
    ok: statuses[200] || statuses[201] || 0,
    rate429: total ? Math.round(((statuses[429] || 0) / total) * 1000) / 10 : 0,
    errorRate: total ? Math.round(((errors5xx + (statuses.network || 0) + result.errors) / total) * 1000) / 10 : 0,
    timeouts: result.timeouts,
    peakRssMb: Math.round(peakRss / 1048576),
    peakHeapMb: Math.round(peakHeap / 1048576),
    cpuPct: Math.round((cpuMs / wallMs) * 100),
    crashed: child.crashed !== false,
  };
}

function table(rows) {
  const cols = ['name', 'connections', 'requests', 'rps', 'avg', 'p95', 'p99', 'rate429', 'errorRate', 'peakRssMb', 'cpuPct', 'crashed'];
  const head = ['Scenario', 'Conns', 'Requests', 'Req/s', 'Avg ms', 'p95 ms', 'p99 ms', '429 %', 'Error %', 'Peak RSS MB', 'CPU %', 'Crashed'];
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${cols.map(c => r[c]).join(' | ')} |`)].join('\n');
}

(async () => {
  if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(BASE).hostname)) throw new Error('load tests only run against localhost');
  const results = [];

  // Phase 1 — capacity: realistic endpoints with limits raised so we measure the server itself.
  const relaxed = { RATE_LIMIT_MAX_REQUESTS: '10000000', SYNC_RATE_LIMIT_MAX: '10000000', AUTH_RATE_LIMIT_MAX: '10000000' };
  let child = await startServer(relaxed);
  const toMb = s => (s ? { rssMb: Math.round(s.memory.rss / 1048576), heapUsedMb: Math.round(s.memory.heapUsed / 1048576) } : null);
  const startMemory = toMb(await sampleStats(child, { gc: true }));
  const cookies = await signInMany(100);
  const payload = plannerPayload();
  for (const connections of [10, 25, 50, 100]) {
    results.push(await run(child, { name: 'GET /api/health', connections, requests: [{ method: 'GET', path: '/api/health' }] }));
    results.push(await run(child, { name: 'GET /api/data (auth)', connections, requests: [{ method: 'GET', path: '/api/data' }], cookies }));
  }
  for (const connections of [10, 25, 50]) {
    results.push(await run(child, { name: 'PUT /api/data 60KB (auth)', connections, requests: [{ method: 'PUT', path: '/api/data', body: payload }], cookies }));
  }
  results.push(await run(child, { name: 'mixed read/write (auth)', connections: 50, requests: [{ method: 'GET', path: '/api/data' }, { method: 'GET', path: '/api/auth/me' }, { method: 'GET', path: '/api/config' }, { method: 'PUT', path: '/api/data', body: payload }], cookies }));
  const crashedRelaxed = child.crashed !== false;
  // Leak check: memory once the load stops and the process idles (GC gets a chance to run).
  await new Promise(r => setTimeout(r, 8000));
  const idleMemory = toMb(await sampleStats(child, { gc: true }));
  await stopServer(child);

  // Phase 2 — protection: default production limits; flooding must produce 429s, not errors.
  // The mock server inherits the test suite's generous limits, so pass the production defaults
  // (server/config.js) explicitly.
  child = await startServer({ RATE_LIMIT_MAX_REQUESTS: '300', AUTH_RATE_LIMIT_MAX: '20', OAUTH_CALLBACK_RATE_LIMIT_MAX: '30', UPLOAD_RATE_LIMIT_MAX: '60', SYNC_RATE_LIMIT_MAX: '30' });
  results.push(await run(child, { name: 'flood POST /api/auth/google (default limits)', connections: 25, requests: [{ method: 'POST', path: '/api/auth/google', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential: 'invalid-credential-x' }) }] }));
  results.push(await run(child, { name: 'flood GET /api/config (default limits)', connections: 50, requests: [{ method: 'GET', path: '/api/config' }] }));
  const flooded = await fetch(`${BASE}/api/health`).then(r => r.status).catch(() => 'down');
  const crashedDefault = child.crashed !== false;
  await stopServer(child);

  console.log(`\nLocal load test (${DURATION}s per scenario, in-memory DB)\n`);
  console.log(table(results));
  console.log(`\nMemory — at start: ${JSON.stringify(startMemory)}; after load + idle + full GC: ${JSON.stringify(idleMemory)}; peak heap under load: ${Math.max(...results.map(r => r.peakHeapMb))} MB`);
  console.log(`\nServer alive after floods: ${flooded === 200 ? 'yes' : flooded}; crashes: ${crashedRelaxed || crashedDefault ? 'YES' : 'none'}`);
  const unexpected = results.filter(r => r.errorRate > 0 || r.crashed);
  if (unexpected.length || flooded !== 200) {
    console.error('\nFAIL: errors or crashes under load:', unexpected.map(r => r.name).join(', '));
    process.exit(1);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
