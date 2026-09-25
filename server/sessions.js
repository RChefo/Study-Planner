'use strict';

const crypto = require('node:crypto');

/**
 * Sessions: an HMAC-signed cookie carrying a random session id (`sid`) plus the public
 * profile. The `sid` must also exist in the `sessions` collection, so logout and
 * "sign out everywhere" revoke tokens server-side (a stolen cookie stops working).
 */

const COOKIE_NAME = 'rafiq_session';
const SID_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

/** Parses a Cookie header without ever throwing (malformed %-escapes are skipped). */
function parseCookies(header) {
  const out = Object.create(null);
  if (typeof header !== 'string' || header.length > 8192) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    if (!name || name in out) continue;
    let value = part.slice(i + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }
    out[name] = value;
  }
  return out;
}

function sign(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest();
}

function safeEqualBuffers(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSessionService({ db, config, clock = () => Date.now() }) {
  const sessions = db.collection('sessions');
  const ttlMs = config.sessionDays * 86_400_000;

  const cookieOptions = (extra = {}) => ({ httpOnly: true, secure: config.production, sameSite: 'lax', path: '/', ...extra });

  function encode(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${sign(config.sessionSecret, body).toString('base64url')}`;
  }

  /** Verifies signature + expiry of a token string. Returns the payload or null. */
  function decode(token) {
    if (typeof token !== 'string' || token.length > 4096) return null;
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra !== undefined) return null;
    let actual;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      return null;
    }
    if (!safeEqualBuffers(actual, sign(config.sessionSecret, body))) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!payload || typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || !SID_PATTERN.test(payload.sid)) return null;
      if (typeof payload.exp !== 'number' || payload.exp * 1000 <= clock()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /** Creates a new server-side session (fresh id on every sign-in) and sets the cookie. */
  async function issue(res, user, meta = {}) {
    await db.collection('users').updateOne(
      { _id: user.sub },
      { $set: { ...user, lastSignInAt: new Date(clock()) }, $setOnInsert: { createdAt: new Date(clock()) } },
      { upsert: true },
    );
    const sid = crypto.randomBytes(32).toString('base64url');
    const now = clock();
    await sessions.insertOne({
      _id: sid,
      userId: user.sub,
      provider: user.provider,
      createdAt: new Date(now),
      expiresAt: new Date(now + ttlMs),
      userAgent: typeof meta.userAgent === 'string' ? meta.userAgent.slice(0, 200) : undefined,
    });
    const token = encode({ ...user, sid, iat: Math.floor(now / 1000), exp: Math.floor((now + ttlMs) / 1000) });
    res.cookie(COOKIE_NAME, token, cookieOptions({ maxAge: ttlMs }));
  }

  /** Resolves the request's session (signature + expiry + server-side record) or null. */
  async function authenticate(req) {
    const payload = decode(parseCookies(req.headers.cookie)[COOKIE_NAME]);
    if (!payload) return null;
    const record = await sessions.findOne({ _id: payload.sid, userId: payload.sub, expiresAt: { $gt: new Date(clock()) } }, { projection: { _id: 1 } });
    if (!record) return null;
    return {
      sid: payload.sid,
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      picture: typeof payload.picture === 'string' ? payload.picture : '',
      provider: payload.provider === 'discord' ? 'discord' : 'google',
    };
  }

  async function revoke(sid) {
    if (typeof sid === 'string' && SID_PATTERN.test(sid)) await sessions.deleteOne({ _id: sid });
  }

  async function revokeAll(userId) {
    await sessions.deleteMany({ userId });
  }

  function clear(res) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
  }

  /** Signature-only check used by logout, so a stale/revoked cookie can still be cleared. */
  function peek(req) {
    return decode(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  }

  return { issue, authenticate, revoke, revokeAll, clear, peek, cookieOptions };
}

module.exports = { createSessionService, parseCookies, COOKIE_NAME };
