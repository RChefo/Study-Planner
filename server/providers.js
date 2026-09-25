'use strict';

const { AppError } = require('./errors');

/** Rejects with PROVIDER_UNAVAILABLE if `promise` doesn't settle within `ms`. */
function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new AppError('PROVIDER_UNAVAILABLE')), ms);
    }),
  ]);
}

const NETWORK_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']);

/** Google ID-token verification via google-auth-library, with timeout and error mapping. */
function createGoogleVerifier({ clientId, timeoutMs }) {
  if (!clientId) return null;
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(clientId);
  return async credential => {
    try {
      const ticket = await withTimeout(client.verifyIdToken({ idToken: credential, audience: clientId }), timeoutMs);
      return ticket.getPayload();
    } catch (err) {
      if (err instanceof AppError) throw err;
      const status = err?.response?.status;
      if (NETWORK_CODES.has(err?.code) || (typeof status === 'number' && status >= 500)) throw new AppError('PROVIDER_UNAVAILABLE', { cause: err });
      throw new AppError('INVALID_CREDENTIAL', { cause: err });
    }
  };
}

/** Discord OAuth2 authorization-code exchange + profile lookup (server-to-server only). */
function createDiscordClient({ discord, timeoutMs, fetchImpl = globalThis.fetch }) {
  if (!discord) return null;
  const basic = Buffer.from(`${discord.clientId}:${discord.clientSecret}`).toString('base64');
  return {
    authorizeUrl(state) {
      const params = new URLSearchParams({ client_id: discord.clientId, response_type: 'code', redirect_uri: discord.redirectUri, scope: 'identify email', state });
      return `https://discord.com/oauth2/authorize?${params}`;
    },
    async exchange(code) {
      const signal = AbortSignal.timeout(timeoutMs);
      const tokenResponse = await fetchImpl('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: discord.redirectUri }),
        signal,
      });
      if (tokenResponse.status >= 500) throw new AppError('PROVIDER_UNAVAILABLE');
      if (!tokenResponse.ok) throw new AppError('INVALID_CREDENTIAL');
      const token = await tokenResponse.json();
      if (typeof token?.access_token !== 'string') throw new AppError('INVALID_CREDENTIAL');
      const profileResponse = await fetchImpl('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token.access_token}` }, signal });
      if (!profileResponse.ok) throw new AppError(profileResponse.status >= 500 ? 'PROVIDER_UNAVAILABLE' : 'INVALID_CREDENTIAL');
      const profile = await profileResponse.json();
      if (typeof profile?.id !== 'string' || !/^\d{1,25}$/.test(profile.id)) throw new AppError('INVALID_CREDENTIAL');
      return profile;
    },
  };
}

module.exports = { createGoogleVerifier, createDiscordClient, withTimeout };
