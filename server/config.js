'use strict';

/**
 * Reads and validates environment configuration once at startup.
 * Pure function of `env` so tests can build configs without touching process.env.
 */

const PLACEHOLDER = 'replace-with-';

function isSet(env, key) {
  return typeof env[key] === 'string' && env[key].trim() !== '' && !env[key].startsWith(PLACEHOLDER);
}

function int(env, key, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!isSet(env, key)) return fallback;
  const value = Number(env[key]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function list(env, key) {
  if (!isSet(env, key)) return [];
  return env[key].split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
}

/** `TRUST_PROXY`: "false" (default), "true", a hop count, or an Express trust-proxy expression. */
function trustProxy(env) {
  if (!isSet(env, 'TRUST_PROXY')) return false;
  const raw = env.TRUST_PROXY.trim();
  if (raw === 'false') return false;
  if (raw === 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

function loadConfig(env = process.env, { requireSecrets = true } = {}) {
  const nodeEnv = env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development';
  const production = nodeEnv === 'production';
  const port = int(env, 'PORT', 3000, { min: 1, max: 65535 });

  const discordEnabled = isSet(env, 'DISCORD_CLIENT_ID') && isSet(env, 'DISCORD_CLIENT_SECRET') && isSet(env, 'DISCORD_REDIRECT_URI');
  const googleClientId = isSet(env, 'GOOGLE_CLIENT_ID') ? env.GOOGLE_CLIENT_ID.trim() : '';

  if (requireSecrets) {
    const missing = ['MONGODB_URI', 'SESSION_SECRET'].filter(key => !isSet(env, key));
    if (!googleClientId && !discordEnabled) missing.push('GOOGLE_CLIENT_ID (or DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET + DISCORD_REDIRECT_URI)');
    if (missing.length) throw new Error(`Missing required environment settings: ${missing.join(', ')}`);
  }
  const sessionSecret = isSet(env, 'SESSION_SECRET') ? env.SESSION_SECRET : '';
  if (requireSecrets && sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');

  if (discordEnabled) {
    let redirect;
    try {
      redirect = new URL(env.DISCORD_REDIRECT_URI);
    } catch {
      throw new Error('DISCORD_REDIRECT_URI must be an absolute URL.');
    }
    if (!redirect.pathname.endsWith('/api/auth/discord/callback')) throw new Error('DISCORD_REDIRECT_URI must point to /api/auth/discord/callback.');
    if (production && redirect.protocol !== 'https:') throw new Error('DISCORD_REDIRECT_URI must use https in production.');
  }

  // Browser origins allowed to call the API with credentials (CORS + CSRF origin check).
  // The app's own origin is always allowed; these are *additional* origins.
  const devOrigins = production ? [] : [`http://localhost:${port}`, `http://127.0.0.1:${port}`, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = [...new Set([...list(env, 'APP_ORIGIN'), ...list(env, 'ALLOWED_ORIGINS'), ...devOrigins])];
  if (allowedOrigins.includes('*')) throw new Error('ALLOWED_ORIGINS must list explicit origins; "*" is not allowed with credentials.');

  const maxUploadMb = int(env, 'MAX_UPLOAD_MB', 40, { min: 1, max: 200 });

  return {
    nodeEnv,
    production,
    port,
    trustProxy: trustProxy(env),
    mongoUri: isSet(env, 'MONGODB_URI') ? env.MONGODB_URI : '',
    mongoDatabase: isSet(env, 'MONGODB_DATABASE') ? env.MONGODB_DATABASE : 'rafiq_study',
    sessionSecret,
    sessionDays: int(env, 'SESSION_DAYS', 14, { min: 1, max: 90 }),
    googleClientId,
    discord: discordEnabled
      ? { clientId: env.DISCORD_CLIENT_ID.trim(), clientSecret: env.DISCORD_CLIENT_SECRET, redirectUri: env.DISCORD_REDIRECT_URI.trim() }
      : null,
    allowedOrigins,
    uploads: {
      maxBytes: maxUploadMb * 1024 * 1024,
      maxUploadMb,
      userQuotaBytes: int(env, 'USER_STORAGE_QUOTA_MB', 500, { min: 1, max: 100000 }) * 1024 * 1024,
      orphanGraceHours: int(env, 'ORPHAN_FILE_GRACE_HOURS', 24, { min: 1, max: 24 * 30 }),
    },
    sync: { maxBytes: int(env, 'SYNC_MAX_MB', 12, { min: 1, max: 15 }) * 1024 * 1024 },
    rateLimits: {
      api: { windowMs: int(env, 'RATE_LIMIT_WINDOW_MS', 60_000, { min: 1000 }), max: int(env, 'RATE_LIMIT_MAX_REQUESTS', 300, { min: 1 }) },
      auth: { windowMs: int(env, 'AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60_000, { min: 1000 }), max: int(env, 'AUTH_RATE_LIMIT_MAX', 20, { min: 1 }) },
      oauthCallback: { windowMs: int(env, 'AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60_000, { min: 1000 }), max: int(env, 'OAUTH_CALLBACK_RATE_LIMIT_MAX', 30, { min: 1 }) },
      upload: { windowMs: int(env, 'UPLOAD_RATE_LIMIT_WINDOW_MS', 60 * 60_000, { min: 1000 }), max: int(env, 'UPLOAD_RATE_LIMIT_MAX', 60, { min: 1 }) },
      sync: { windowMs: int(env, 'SYNC_RATE_LIMIT_WINDOW_MS', 60_000, { min: 1000 }), max: int(env, 'SYNC_RATE_LIMIT_MAX', 30, { min: 1 }) },
    },
    timeouts: {
      providerMs: int(env, 'PROVIDER_TIMEOUT_MS', 10_000, { min: 1000, max: 60_000 }),
      requestMs: int(env, 'REQUEST_TIMEOUT_MS', 60_000, { min: 5000, max: 600_000 }),
      shutdownMs: int(env, 'SHUTDOWN_TIMEOUT_MS', 10_000, { min: 1000, max: 120_000 }),
    },
    logLevel: ['debug', 'info', 'warn', 'error', 'silent'].includes(env.LOG_LEVEL) ? env.LOG_LEVEL : nodeEnv === 'test' ? 'silent' : 'info',
  };
}

module.exports = { loadConfig, isSet };
