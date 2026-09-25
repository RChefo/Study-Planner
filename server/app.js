'use strict';

const path = require('node:path');
const express = require('express');
const { AppError, errorHandler } = require('./errors');
const { createSessionService } = require('./sessions');
const { requestId, accessLog, securityHeaders, cors, originCheck, limiter, methodNotAllowed } = require('./security');
const { authRouter } = require('./routes/auth');
const { dataRouter } = require('./routes/data');
const { filesRouter, createFileStore } = require('./routes/files');

/**
 * Builds the Express app. Dependencies are injected so tests can supply an in-memory
 * database and fake identity providers; production wiring lives in server.js.
 */
function createApp({ config, db, bucket, logger, googleVerifier = null, discordClient = null, clientDir = null, isReady = async () => true, clock }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple'); // no nested objects from ?a[b]=c

  const sessions = createSessionService({ db, config, clock });
  const files = createFileStore({ db, bucket, config, clock });

  const requireUser = async (req, res, next) => {
    req.user = await sessions.authenticate(req);
    if (!req.user) throw new AppError('UNAUTHENTICATED');
    next();
  };

  app.use(requestId());
  app.use(accessLog(logger));
  app.use(securityHeaders(config));

  // ---------- API ----------
  const api = express.Router();
  api.use(cors(config));
  api.use(originCheck(config));

  // Liveness: process is up. Readiness: database reachable. No versions or hosts exposed.
  api.get('/health', (req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));

  api.use(limiter('api', config.rateLimits.api));

  // Readiness pings the database, so it sits behind the rate limiter.
  api.get('/health/ready', async (req, res) => {
    const ready = await isReady().catch(() => false);
    res.set('Cache-Control', 'no-store').status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
  });

  api
    .route('/config')
    .get((req, res) => res.json({ googleClientId: config.googleClientId, discordEnabled: !!discordClient }))
    .all(methodNotAllowed);

  api.use('/auth', authRouter({ config, sessions, googleVerifier, discordClient, requireUser, logger }));
  api.use('/data', dataRouter({ config, db, files, requireUser, logger, clock }));
  api.use('/files', filesRouter({ config, files, requireUser, logger }));
  api.use((req, res, next) => next(new AppError('NOT_FOUND')));

  app.use('/api', api);

  // ---------- Frontend (Vite build) ----------
  if (clientDir) {
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders(res, filePath) {
          // Hashed build assets never change; everything else must revalidate.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.get('/{*splat}', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
    app.all('/{*splat}', methodNotAllowed);
  }

  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
