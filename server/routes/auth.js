'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { AppError, toAppError } = require('../errors');
const { schemas, parse } = require('../validation');
const { parseCookies } = require('../sessions');
const { jsonBody, limiter, methodNotAllowed } = require('../security');

const OAUTH_STATE_COOKIE = 'rafiq_oauth_state';
const OAUTH_STATE_PATH = '/api/auth/discord';

/** Only same-site relative paths may be used as post-login destinations (no open redirects). */
function safeNextPath(value) {
  if (typeof value !== 'string' || value.length > 512) return '/app';
  const hasControlChar = [...value].some(ch => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f);
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar) return '/app';
  return value;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Maps any failure in the redirect flow to a short, fixed code for /auth/callback. */
function callbackReason(err) {
  const code = toAppError(err).code;
  if (code === 'PROVIDER_UNAVAILABLE' || err?.name === 'TimeoutError') return 'provider_unavailable';
  if (code === 'INVALID_CREDENTIAL') return 'provider_error';
  return 'server_error';
}

function authRouter({ config, sessions, googleVerifier, discordClient, requireUser, logger }) {
  const router = express.Router();
  const authLimit = limiter('auth', config.rateLimits.auth);
  const callbackLimit = limiter('oauth-callback', config.rateLimits.oauthCallback);

  router
    .route('/google')
    .post(authLimit, jsonBody(8 * 1024), async (req, res) => {
      if (!googleVerifier) throw new AppError('PROVIDER_NOT_CONFIGURED');
      const { credential } = parse(schemas.googleSignIn, req.body);
      const profile = await googleVerifier(credential);
      if (!profile?.sub || typeof profile.sub !== 'string') throw new AppError('INVALID_CREDENTIAL');
      if (!profile.email_verified) throw new AppError('GOOGLE_ACCOUNT_UNVERIFIED');
      // Google account ids are kept as-is so existing users keep their planner data.
      const user = {
        sub: profile.sub,
        email: String(profile.email || '').slice(0, 320),
        name: String(profile.name || profile.email || '').slice(0, 200),
        picture: typeof profile.picture === 'string' && profile.picture.startsWith('https://') ? profile.picture.slice(0, 500) : '',
        provider: 'google',
      };
      await sessions.issue(res, user, { userAgent: req.get('user-agent') });
      res.json({ user });
    })
    .all(methodNotAllowed);

  // Discord: OAuth 2.0 authorization-code flow. The client secret never leaves the server.
  router
    .route('/discord/start')
    .get(authLimit, (req, res) => {
      if (!discordClient) return res.redirect(302, '/auth/callback?provider=discord&error=discord_not_configured');
      const query = schemas.discordStartQuery.safeParse(req.query);
      const next = safeNextPath(query.success ? query.data.next : undefined);
      const state = crypto.randomBytes(24).toString('base64url');
      res.cookie(OAUTH_STATE_COOKIE, `${state}.${Buffer.from(next).toString('base64url')}`, sessions.cookieOptions({ path: OAUTH_STATE_PATH, maxAge: 10 * 60 * 1000 }));
      res.redirect(302, discordClient.authorizeUrl(state));
    })
    .all(methodNotAllowed);

  router
    .route('/discord/callback')
    .get(callbackLimit, async (req, res) => {
      const fail = reason => res.redirect(302, `/auth/callback?provider=discord&error=${reason}`);
      // Parsing never throws; any failure below becomes a redirect, never a crash.
      const stored = parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE] || '';
      res.clearCookie(OAUTH_STATE_COOKIE, sessions.cookieOptions({ path: OAUTH_STATE_PATH }));
      if (!discordClient) return fail('discord_not_configured');
      const query = schemas.discordCallbackQuery.safeParse(req.query);
      if (!query.success) return fail('provider_error');
      const [expectedState, encodedNext = ''] = stored.split('.');
      const state = query.data.state || '';
      if (!expectedState || !state || !safeEqual(expectedState, state)) return fail('state_mismatch');
      if (query.data.error) return fail(query.data.error === 'access_denied' ? 'cancelled' : 'provider_error');
      if (!query.data.code) return fail('provider_error');
      let next;
      try {
        next = safeNextPath(Buffer.from(encodedNext, 'base64url').toString('utf8'));
      } catch {
        next = '/app';
      }
      try {
        const profile = await discordClient.exchange(query.data.code);
        // Namespaced id so a Discord account can never collide with a Google account id.
        const user = {
          sub: `discord:${profile.id}`,
          email: profile.verified && typeof profile.email === 'string' ? profile.email.slice(0, 320) : '',
          name: String(profile.global_name || profile.username || 'Discord').slice(0, 200),
          picture: typeof profile.avatar === 'string' && /^(a_)?[a-f\d]{32}$/.test(profile.avatar) ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128` : '',
          provider: 'discord',
        };
        await sessions.issue(res, user, { userAgent: req.get('user-agent') });
        res.redirect(302, `/auth/callback?provider=discord&next=${encodeURIComponent(next)}`);
      } catch (err) {
        const reason = callbackReason(err);
        logger[reason === 'server_error' ? 'error' : 'warn']('discord sign-in failed', { requestId: req.id, reason, err });
        fail(reason);
      }
    })
    .all(methodNotAllowed);

  router
    .route('/me')
    .get(requireUser, (req, res) => {
      const { sub, email, name, picture, provider } = req.user;
      res.json({ user: { sub, email, name, picture, provider } });
    })
    .all(methodNotAllowed);

  // Logout works even with an expired/revoked cookie: it always clears it.
  router
    .route('/logout')
    .post(async (req, res) => {
      const payload = sessions.peek(req);
      if (payload) await sessions.revoke(payload.sid);
      sessions.clear(res);
      res.status(204).end();
    })
    .all(methodNotAllowed);

  router
    .route('/logout-all')
    .post(requireUser, async (req, res) => {
      await sessions.revokeAll(req.user.sub);
      sessions.clear(res);
      res.status(204).end();
    })
    .all(methodNotAllowed);

  return router;
}

module.exports = { authRouter, safeNextPath };
