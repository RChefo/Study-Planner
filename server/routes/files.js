'use strict';

const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const express = require('express');
const { ObjectId } = require('mongodb');
const { AppError } = require('../errors');
const { schemas, parse } = require('../validation');
const { jsonBody, limiter, methodNotAllowed } = require('../security');

const TYPES = {
  'application/pdf': { ext: '.pdf', magic: bytes => bytes.subarray(0, 5).toString('latin1') === '%PDF-' },
  'image/png': { ext: '.png', magic: bytes => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { ext: '.jpg', magic: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/webp': { ext: '.webp', magic: bytes => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP' },
};
const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_FILES_PER_USER = 10_000;

/**
 * Display name only (GridFS stores content under a random ObjectId; names never touch the
 * filesystem). Still normalized: no path segments, control characters, reserved characters,
 * leading dots or misleading extensions.
 */
function safeFileName(name, mime) {
  const raw = typeof name === 'string' ? name.normalize('NFC') : '';
  const noControl = [...raw].filter(ch => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f).join('');
  let base = noControl.split(/[\\/]/).pop() || '';
  base = base.replace(/[<>:"|?*]/g, '_').replace(/^[.\s]+/, '').replace(/\.[A-Za-z0-9]{1,10}$/, '').trim();
  return `${base.slice(0, 120) || 'attachment'}${TYPES[mime].ext}`;
}

/** Validates a `data:` URL upload: allowed type, base64 charset, size, and matching magic bytes. */
function decodeUpload(dataUrl, maxBytes) {
  const header = DATA_URL.exec(dataUrl);
  const mime = header?.[1].toLowerCase();
  if (!header || !TYPES[mime]) throw new AppError('UNSUPPORTED_FILE_TYPE');
  const payload = dataUrl.slice(header[0].length).replace(/\s+/g, '');
  if (!payload || payload.length % 4 === 1 || !BASE64.test(payload)) throw new AppError('INVALID_REQUEST');
  if (Math.floor((payload.length * 3) / 4) > maxBytes + 3) throw new AppError('FILE_TOO_LARGE');
  const bytes = Buffer.from(payload, 'base64');
  if (!bytes.length) throw new AppError('INVALID_REQUEST');
  if (bytes.length > maxBytes) throw new AppError('FILE_TOO_LARGE');
  if (!TYPES[mime].magic(bytes)) throw new AppError('UNSUPPORTED_FILE_TYPE');
  return { mime, bytes };
}

/** GridFS-backed file store; every lookup is scoped to the owning user. */
function createFileStore({ db, bucket, config, clock = () => Date.now() }) {
  const meta = db.collection('studyFiles.files');
  return {
    async ownedIds(userId, ids) {
      const found = await meta.find({ _id: { $in: ids }, 'metadata.userId': userId }, { projection: { _id: 1 } }).toArray();
      return new Set(found.map(f => f._id.toString().toLowerCase()));
    },
    async usage(userId) {
      const rows = await meta.find({ 'metadata.userId': userId }, { projection: { length: 1 } }).limit(MAX_FILES_PER_USER + 1).toArray();
      return { count: rows.length, bytes: rows.reduce((n, r) => n + (Number(r.length) || 0), 0) };
    },
    async removeOrphans(userId, referenced) {
      const cutoff = new Date(clock() - config.uploads.orphanGraceHours * 3_600_000);
      const candidates = await meta.find({ 'metadata.userId': userId, uploadDate: { $lt: cutoff } }, { projection: { _id: 1 } }).limit(1000).toArray();
      for (const file of candidates) {
        if (!referenced.has(file._id.toString().toLowerCase())) await bucket.delete(file._id);
      }
    },
    findOwned: (userId, id) => meta.findOne({ _id: id, 'metadata.userId': userId }),
    findDuplicate: (userId, sha256) => meta.findOne({ 'metadata.userId': userId, 'metadata.sha256': sha256 }, { projection: { _id: 1 } }),
    async store(userId, { bytes, mime, name, sha256 }) {
      const stream = bucket.openUploadStream(name, { metadata: { userId, sha256, mimeType: mime } });
      await new Promise((resolve, reject) => {
        stream.once('finish', resolve);
        stream.once('error', reject);
        Readable.from([bytes]).pipe(stream);
      }).catch(async err => {
        // Don't leave partial chunks behind on failure.
        await bucket.delete(stream.id).catch(() => {});
        throw err;
      });
      return stream.id.toString();
    },
    openDownload: id => bucket.openDownloadStream(id),
  };
}

function filesRouter({ config, files, requireUser, logger }) {
  const router = express.Router();
  const uploadLimit = limiter('upload', config.rateLimits.upload, { perUser: true });
  // base64 is 4/3 of the binary size, plus JSON envelope.
  const bodyLimit = Math.ceil((config.uploads.maxBytes * 4) / 3) + 64 * 1024;

  router
    .route('/')
    .post(requireUser, uploadLimit, jsonBody(bodyLimit), async (req, res) => {
      const body = parse(schemas.uploadFile, req.body);
      const { mime, bytes } = decodeUpload(body.data, config.uploads.maxBytes);
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const existing = await files.findDuplicate(req.user.sub, sha256);
      if (existing) return res.json({ id: existing._id.toString(), sha256 });

      const usage = await files.usage(req.user.sub);
      if (usage.count >= MAX_FILES_PER_USER || usage.bytes + bytes.length > config.uploads.userQuotaBytes) throw new AppError('STORAGE_QUOTA_EXCEEDED');

      const id = await files.store(req.user.sub, { bytes, mime, name: safeFileName(body.name, mime), sha256 });
      logger.debug('file stored', { requestId: req.id, bytes: bytes.length, mime });
      res.status(201).json({ id, sha256 });
    })
    .all(methodNotAllowed);

  router
    .route('/:id')
    .get(requireUser, async (req, res, next) => {
      const { id } = parse(schemas.fileParams, req.params);
      const record = await files.findOwned(req.user.sub, new ObjectId(id));
      // Same response for "missing" and "someone else's" — no existence oracle.
      if (!record) throw new AppError('NOT_FOUND');
      const mime = TYPES[record.metadata?.mimeType] ? record.metadata.mimeType : 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', String(record.length));
      res.setHeader('Content-Disposition', `attachment; filename="file${TYPES[mime]?.ext ?? ''}"; filename*=UTF-8''${encodeURIComponent(record.filename || 'file')}`);
      // Even if opened directly, a stored file can never run script in our origin.
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cache-Control', 'private, max-age=3600');
      const stream = files.openDownload(record._id);
      stream.on('error', next);
      stream.pipe(res);
    })
    .all(methodNotAllowed);

  return router;
}

module.exports = { filesRouter, createFileStore, safeFileName, decodeUpload };
