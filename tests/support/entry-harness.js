'use strict';

/**
 * Runs the REAL entry point (server.js: config, DB wiring, signal handlers, graceful shutdown)
 * with MongoDB replaced by the in-memory stand-in. Test-only.
 *
 * IPC: { type: 'signal', name: 'SIGTERM' } emits the signal inside the process (Windows cannot
 * deliver POSIX signals to a child), exercising exactly the handler server.js registered.
 */

const Module = require('node:module');
const { createMemoryDb } = require('./memory-db');

const memory = createMemoryDb();
memory.setDelay(Number(process.env.HARNESS_DB_DELAY_MS || 0));
const realMongo = require('mongodb');
let closed = false;

class FakeMongoClient {
  async connect() {}
  db() {
    return memory.db;
  }
  async close() {
    closed = true;
    process.send?.({ type: 'db-closed' });
  }
}
class FakeBucket {
  constructor() {
    return memory.bucket;
  }
}

const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'mongodb') return { ...realMongo, MongoClient: FakeMongoClient, GridFSBucket: FakeBucket };
  return load.call(this, request, parent, isMain);
};

process.on('message', msg => {
  if (msg?.type === 'signal') process.emit(msg.name);
});
process.on('exit', code => process.send?.({ type: 'exit', code, dbClosed: closed }));

require('../../server.js');
