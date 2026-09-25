'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { AppError } = require('../errors');
const { schemas, parse, referencedFileIds } = require('../validation');
const { jsonBody, limiter, methodNotAllowed } = require('../security');

/**
 * Per-user planner document. Every query is keyed by the *session's* user id — the client
 * never supplies whose data to read or write, so there is no id to tamper with (no IDOR).
 */
function dataRouter({ config, db, files, requireUser, logger, clock = () => Date.now() }) {
  const router = express.Router();
  const planner = db.collection('plannerData');
  const syncLimit = limiter('sync', config.rateLimits.sync, { perUser: true });

  router
    .route('/')
    .get(requireUser, async (req, res) => {
      const record = await planner.findOne({ _id: req.user.sub }, { projection: { data: 1, updatedAt: 1 } });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ data: record?.data ?? null, updatedAt: record?.updatedAt ?? null });
    })
    .put(requireUser, syncLimit, jsonBody(config.sync.maxBytes), async (req, res) => {
      const { data } = parse(schemas.putData, req.body);

      // Attachments must reference files that exist and belong to this user.
      const referenced = referencedFileIds(data);
      if (referenced.length > 20_000) throw new AppError('INVALID_REQUEST');
      if (referenced.length) {
        const owned = await files.ownedIds(req.user.sub, referenced.map(id => new ObjectId(id)));
        const missing = referenced.filter(id => !owned.has(id));
        if (missing.length) throw new AppError('FILES_MISSING', { details: { missing: missing.slice(0, 200) } });
      }

      const updatedAt = new Date(clock());
      await planner.replaceOne({ _id: req.user.sub }, { _id: req.user.sub, data, updatedAt }, { upsert: true });
      res.json({ updatedAt });

      // Housekeeping after responding: remove this user's old, no-longer-referenced uploads.
      files.removeOrphans(req.user.sub, new Set(referenced)).catch(err => logger.warn('orphan cleanup failed', { requestId: req.id, err }));
    })
    .all(methodNotAllowed);

  return router;
}

module.exports = { dataRouter };
