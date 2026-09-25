'use strict';

/**
 * Minimal structured (JSON-lines) logger with key-based redaction.
 * Never pass request bodies, tokens or cookies; redaction is a safety net, not the plan.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
// Keys whose values are never logged (OAuth `code`/`state`, tokens, cookies, secrets, credentials…).
const SENSITIVE_KEY = /pass|secret|token|cookie|authorization|credential|^code$|^state$|mongo.*uri/i;
const MONGO_URI = /mongodb(\+srv)?:\/\/[^\s"']+/gi;

function redact(value, depth = 0) {
  if (depth > 4) return '[depth]';
  if (typeof value === 'string') return value.replace(MONGO_URI, 'mongodb://[redacted]').slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value)) out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(v, depth + 1);
    return out;
  }
  return value;
}

/** Serializes an Error without leaking connection strings; stack only below `error` in non-production. */
function serializeError(err, { includeStack }) {
  if (!(err instanceof Error)) return { message: redact(String(err)) };
  return {
    name: err.name,
    message: redact(err.message),
    code: typeof err.code === 'string' || typeof err.code === 'number' ? err.code : undefined,
    stack: includeStack ? redact(err.stack) : undefined,
  };
}

function createLogger({ level = 'info', production = false, stream = process.stdout } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const write = (lvl, msg, fields = {}) => {
    if (LEVELS[lvl] < threshold) return;
    const { err, ...rest } = fields;
    const entry = { time: new Date().toISOString(), level: lvl, msg, ...redact(rest) };
    if (err) entry.err = serializeError(err, { includeStack: !production || lvl === 'error' });
    stream.write(`${JSON.stringify(entry)}\n`);
  };
  return {
    debug: (msg, fields) => write('debug', msg, fields),
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields),
  };
}

module.exports = { createLogger, redact };
