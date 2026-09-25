'use strict';

const { MongoClient, GridFSBucket } = require('mongodb');

/**
 * Connects with bounded timeouts so an unreachable cluster fails fast (503) instead of
 * hanging requests for 30 s, and creates the few indexes the queries actually need.
 */
async function connectDatabase(config, logger) {
  const client = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    retryWrites: true,
  });
  await client.connect();
  const db = client.db(config.mongoDatabase);
  const bucket = new GridFSBucket(db, { bucketName: 'studyFiles' });
  await ensureIndexes(db, logger);
  return { client, db, bucket };
}

async function ensureIndexes(db, logger) {
  const specs = [
    // Session lookup is by _id; these support expiry and "sign out everywhere".
    ['sessions', { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_ttl' }],
    ['sessions', { userId: 1 }, { name: 'sessions_user' }],
    // Upload de-duplication, ownership checks and quota/cleanup scans are per user.
    ['studyFiles.files', { 'metadata.userId': 1, 'metadata.sha256': 1 }, { name: 'files_user_sha' }],
    ['studyFiles.files', { 'metadata.userId': 1, uploadDate: 1 }, { name: 'files_user_uploaded' }],
  ];
  for (const [collection, keys, options] of specs) {
    try {
      await db.collection(collection).createIndex(keys, options);
    } catch (err) {
      logger.warn('index creation failed', { collection, index: options.name, err });
    }
  }
}

async function ping(db, timeoutMs = 2000) {
  let timer;
  try {
    await Promise.race([
      db.command({ ping: 1 }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('ping timeout')), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { connectDatabase, ensureIndexes, ping };
