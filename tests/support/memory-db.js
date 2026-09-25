'use strict';

const { Writable, Readable } = require('node:stream');
const { ObjectId } = require('mongodb');

/**
 * In-memory stand-in for the subset of the MongoDB driver the server uses (collections,
 * GridFS, ping), with failure injection. Test-only: never used by server.js.
 */

function unavailableError() {
  const err = new Error('connection <monitor> to 127.0.0.1:27017 closed');
  err.name = 'MongoServerSelectionError';
  return err;
}

/** Deep clone that keeps ObjectId/Date/Buffer instances (structuredClone would strip ObjectId's class). */
function clone(value) {
  if (value instanceof ObjectId) return new ObjectId(value.toHexString());
  if (value instanceof Date) return new Date(value.getTime());
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = clone(v);
    return out;
  }
  return value;
}

const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function same(a, b) {
  if (a instanceof ObjectId || b instanceof ObjectId) return String(a) === String(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function compare(a, b) {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  return x < y ? -1 : x > y ? 1 : 0;
}

function matchValue(actual, condition) {
  if (condition && typeof condition === 'object' && !(condition instanceof ObjectId) && !(condition instanceof Date)) {
    const ops = Object.keys(condition);
    if (ops.length && ops.every(op => op.startsWith('$'))) {
      return ops.every(op => {
        const v = condition[op];
        switch (op) {
          case '$in':
            return v.some(x => same(actual, x));
          case '$gt':
            return actual != null && compare(actual, v) > 0;
          case '$lt':
            return actual != null && compare(actual, v) < 0;
          default:
            // The server never builds other operators; fail loudly if it starts to.
            throw new Error(`memory-db: unsupported operator ${op}`);
        }
      });
    }
  }
  return same(actual, condition);
}

const matches = (doc, query) => Object.entries(query).every(([k, v]) => matchValue(get(doc, k), v));

function project(doc, projection) {
  if (!projection) return clone(doc);
  const out = {};
  for (const [key, on] of Object.entries(projection)) if (on && key in doc) out[key] = clone(doc[key]);
  if (projection._id !== 0) out._id = doc._id;
  return out;
}

function createMemoryDb() {
  const collections = new Map();
  const blobs = new Map();
  const state = { unavailable: false, delayMs: 0, operations: 0 };

  async function op(fn) {
    state.operations++;
    if (state.delayMs) await new Promise(r => setTimeout(r, state.delayMs));
    if (state.unavailable) throw unavailableError();
    return fn();
  }

  function collection(name) {
    if (!collections.has(name)) collections.set(name, []);
    const docs = collections.get(name);
    return {
      docs,
      findOne: (query, { projection } = {}) =>
        op(() => {
          const doc = docs.find(d => matches(d, query));
          return doc ? project(doc, projection) : null;
        }),
      find(query, { projection } = {}) {
        let limit = Infinity;
        const cursor = {
          limit(n) {
            limit = n;
            return cursor;
          },
          toArray: () => op(() => docs.filter(d => matches(d, query)).slice(0, limit).map(d => project(d, projection))),
        };
        return cursor;
      },
      insertOne: doc =>
        op(() => {
          if (docs.some(d => same(d._id, doc._id))) throw Object.assign(new Error('E11000 duplicate key'), { name: 'MongoServerError', code: 11000 });
          docs.push(clone(doc));
          return { insertedId: doc._id };
        }),
      updateOne: (query, update, { upsert } = {}) =>
        op(() => {
          let doc = docs.find(d => matches(d, query));
          if (!doc && upsert) {
            doc = { ...clone(query), ...clone(update.$setOnInsert || {}) };
            docs.push(doc);
          }
          if (doc) Object.assign(doc, clone(update.$set || {}));
          return { matchedCount: doc ? 1 : 0 };
        }),
      replaceOne: (query, replacement, { upsert } = {}) =>
        op(() => {
          const i = docs.findIndex(d => matches(d, query));
          if (i >= 0) docs[i] = clone(replacement);
          else if (upsert) docs.push(clone(replacement));
          return { matchedCount: i >= 0 ? 1 : 0 };
        }),
      deleteOne: query =>
        op(() => {
          const i = docs.findIndex(d => matches(d, query));
          if (i >= 0) docs.splice(i, 1);
          return { deletedCount: i >= 0 ? 1 : 0 };
        }),
      deleteMany: query =>
        op(() => {
          let n = 0;
          for (let i = docs.length - 1; i >= 0; i--) if (matches(docs[i], query)) docs.splice(i, 1), n++;
          return { deletedCount: n };
        }),
      createIndex: () => op(() => 'ok'),
    };
  }

  const db = {
    collection,
    command: () => op(() => ({ ok: 1 })),
  };

  const bucket = {
    openUploadStream(filename, { metadata }) {
      const id = new ObjectId();
      const chunks = [];
      const stream = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(chunk);
          cb();
        },
        final(cb) {
          if (state.unavailable) return cb(unavailableError());
          const bytes = Buffer.concat(chunks);
          blobs.set(String(id), bytes);
          collection('studyFiles.files').docs.push({ _id: id, filename, length: bytes.length, uploadDate: new Date(), metadata });
          cb();
        },
      });
      stream.id = id;
      return stream;
    },
    openDownloadStream(id) {
      if (state.unavailable) {
        const r = new Readable({ read() {} });
        process.nextTick(() => r.destroy(unavailableError()));
        return r;
      }
      return Readable.from([blobs.get(String(id)) ?? Buffer.alloc(0)]);
    },
    delete: id =>
      op(() => {
        blobs.delete(String(id));
        const docs = collection('studyFiles.files').docs;
        const i = docs.findIndex(d => same(d._id, id));
        if (i >= 0) docs.splice(i, 1);
      }),
  };

  return {
    db,
    bucket,
    state,
    collections,
    setUnavailable: on => {
      state.unavailable = on;
    },
    setDelay: ms => {
      state.delayMs = ms;
    },
  };
}

module.exports = { createMemoryDb };
