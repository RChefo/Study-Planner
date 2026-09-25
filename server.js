'use strict';

require('dotenv').config({ quiet: true });

const path = require('node:path');
const { loadConfig } = require('./server/config');
const { createLogger } = require('./server/logger');
const { connectDatabase, ping } = require('./server/db');
const { createApp } = require('./server/app');
const { createGoogleVerifier, createDiscordClient } = require('./server/providers');

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger({ level: config.logLevel, production: config.production });
  if (config.production && config.trustProxy === false) {
    logger.warn('TRUST_PROXY is not set: client IPs (rate limiting) will be the proxy address if you run behind one');
  }

  const { client, db, bucket } = await connectDatabase(config, logger);
  let shuttingDown = false;

  const app = createApp({
    config,
    db,
    bucket,
    logger,
    googleVerifier: createGoogleVerifier({ clientId: config.googleClientId, timeoutMs: config.timeouts.providerMs }),
    discordClient: createDiscordClient({ discord: config.discord, timeoutMs: config.timeouts.providerMs }),
    clientDir: path.join(__dirname, 'dist'),
    isReady: async () => !shuttingDown && ping(db),
  });

  const server = app.listen(config.port, () => logger.info('server listening', { port: config.port, env: config.nodeEnv }));
  // Bound slow clients (slowloris) and stuck requests.
  server.requestTimeout = config.timeouts.requestMs;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 65_000;

  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { signal });
    const force = setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(exitCode || 1);
    }, config.timeouts.shutdownMs);
    force.unref();
    server.close(async () => {
      await client.close().catch(err => logger.error('database close failed', { err }));
      logger.info('shutdown complete');
      process.exit(exitCode);
    });
    server.closeIdleConnections?.();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  // A stray rejection must not take the whole service down; log it with context.
  process.on('unhandledRejection', err => logger.error('unhandled promise rejection', { err }));
  // After an uncaught exception process state is unknown: log, drain, restart via the supervisor.
  process.on('uncaughtException', err => {
    logger.error('uncaught exception', { err });
    shutdown('uncaughtException', 1);
  });
}

main().catch(err => {
  // Config/DB startup errors: message only (never the connection string or stack of secrets).
  const message = String(err?.message || err).replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://[redacted]');
  process.stderr.write(`Startup failed: ${message}\n`);
  process.exit(1);
});
