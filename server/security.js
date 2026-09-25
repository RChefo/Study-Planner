'use strict';

const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { AppError, sendError } = require('./errors');

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Assigns a server-generated request id (never trusts a client-supplied one). */
function requestId() {
  return (req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}

/** One log line per API request: no query strings (they carry OAuth codes), no bodies. */
function accessLog(logger) {
  return (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const level = res.statusCode >= 500 ? 'warn' : 'debug';
      logger[level]('request', { requestId: req.id, method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms * 10) / 10 });
    });
    next();
  };
}

function securityHeaders(config) {
  return [
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
          scriptSrcAttr: ["'none'"],
          // 'unsafe-inline' for styles only: Google's sign-in button injects inline styles.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://cdn.discordapp.com'],
          connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
          frameSrc: ['https://accounts.google.com/gsi/'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(config.production ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      // Google Identity Services opens a popup that must be able to post back to us.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      strictTransportSecurity: config.production ? { maxAge: 15_552_000, includeSubDomains: false } : false,
      xPoweredBy: false,
    }),
    (req, res, next) => {
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
      next();
    },
  ];
}

function selfOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * CORS for explicitly configured origins only — never "*", never reflecting arbitrary origins.
 * Same-origin requests need no CORS headers at all.
 */
function cors(config) {
  const allowed = new Set(config.allowedOrigins);
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();
    if (allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.append('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      if (!allowed.has(origin) && origin !== selfOrigin(req)) return sendError(res, new AppError('ORIGIN_NOT_ALLOWED'), req.id);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  };
}

/**
 * CSRF defense in depth (cookies are already SameSite=Lax): state-changing requests must come
 * from the app's own origin or an allowed origin. Requests without Origin (non-browser clients)
 * are rejected only when the browser marks them cross-site.
 */
function originCheck(config) {
  const allowed = new Set(config.allowedOrigins);
  return (req, res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin) {
      if (origin === selfOrigin(req) || allowed.has(origin)) return next();
      return next(new AppError('ORIGIN_NOT_ALLOWED'));
    }
    if (req.get('sec-fetch-site') === 'cross-site') return next(new AppError('ORIGIN_NOT_ALLOWED'));
    next();
  };
}

/** Rejects bodies that are not JSON on routes that expect one. */
function requireJsonBody() {
  return (req, res, next) => {
    const hasBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding') !== undefined;
    if (hasBody && !req.is('application/json')) return next(new AppError('UNSUPPORTED_MEDIA_TYPE'));
    next();
  };
}

function jsonBody(limitBytes) {
  return [requireJsonBody(), express.json({ limit: limitBytes, strict: true, type: 'application/json' })];
}

/**
 * Rate limiter factory. Keys by signed-in user when available (after requireUser), else by IP
 * (IPv6 grouped by /56 so one host can't rotate addresses within its prefix).
 */
function limiter(name, { windowMs, max }, { perUser = false } = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: name,
    keyGenerator: req => (perUser && req.user ? `${name}:user:${req.user.sub}` : `${name}:ip:${ipKeyGenerator(req.ip || '0.0.0.0', 56)}`),
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime instanceof Date ? req.rateLimit.resetTime.getTime() : Date.now() + windowMs;
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))));
      sendError(res, new AppError('RATE_LIMITED'), req.id);
    },
  });
}

function methodNotAllowed(req, res, next) {
  next(new AppError('METHOD_NOT_ALLOWED'));
}

module.exports = { requestId, accessLog, securityHeaders, cors, originCheck, jsonBody, limiter, methodNotAllowed };
