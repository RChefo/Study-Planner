'use strict';

/** Tiny fetch wrapper for tests: returns status, headers, parsed JSON (if any) and raw text. */
async function request(base, path, { method = 'GET', cookie, body, rawBody, headers = {}, redirect = 'manual' } = {}) {
  const init = { method, redirect, headers: { ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['content-type'] ??= 'application/json';
  } else if (rawBody !== undefined) {
    init.body = rawBody;
  }
  const res = await fetch(base + path, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, headers: res.headers, json, text };
}

/** Minimal valid files for upload tests. */
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const PNG_BYTES = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a4d6b4f20000000049454e44ae426082', 'hex');
const dataUrl = (mime, bytes) => `data:${mime};base64,${bytes.toString('base64')}`;

function plannerWithFile(fileId, sha256) {
  return {
    courses: [{ id: 'c1', name: 'Networks', topics: [{ name: 'L1', done: false, pdf: { __cloudFile: fileId, sha256 }, pdfName: 'l1.pdf' }] }],
    commitments: [],
    studyLog: [],
    sessions: [],
    timetable: null,
  };
}

module.exports = { request, PDF_BYTES, PNG_BYTES, dataUrl, plannerWithFile };
