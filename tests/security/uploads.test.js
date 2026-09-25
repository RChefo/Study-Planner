'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('../support/test-app');
const { request, PDF_BYTES, PNG_BYTES, dataUrl } = require('../support/http');
const { safeFileName, decodeUpload } = require('../../server/routes/files');

let t;
let cookie;
before(async () => {
  t = await startTestApp({ env: { MAX_UPLOAD_MB: '1', USER_STORAGE_QUOTA_MB: '2' } });
  cookie = await t.signIn('uploader');
});
after(() => t.close());

const upload = (data, name = 'f.pdf', c = cookie) => request(t.base, '/api/files', { method: 'POST', cookie: c, body: { data, name } });

test('only PDF/PNG/JPEG/WebP data URLs are accepted', async () => {
  const html = Buffer.from('<html><script>alert(1)</script></html>');
  for (const mime of ['text/html', 'image/svg+xml', 'application/x-msdownload', 'application/javascript', 'application/octet-stream', 'text/plain']) {
    const res = await upload(dataUrl(mime, html));
    assert.equal(res.status, 415, mime);
    assert.equal(res.json.error.code, 'UNSUPPORTED_FILE_TYPE');
  }
  assert.equal((await upload(dataUrl('image/png', PNG_BYTES), 'p.png')).status, 201);
});

test('declared type must match the file content (magic bytes)', async () => {
  const cases = [
    ['application/pdf', Buffer.from('<html><script>alert(document.cookie)</script></html>')],
    ['application/pdf', Buffer.from('MZ\x90\x00 fake exe')],
    ['image/png', PDF_BYTES],
    ['image/jpeg', PNG_BYTES],
  ];
  for (const [mime, bytes] of cases) {
    const res = await upload(dataUrl(mime, bytes));
    assert.equal(res.status, 415, `${mime} with ${bytes.subarray(0, 4).toString('hex')}`);
  }
});

test('malformed base64 and non-data URLs are rejected', async () => {
  for (const data of ['https://evil.example/x.pdf', 'data:application/pdf,%PDF-1.4', 'data:application/pdf;base64,@@@@', 'data:application/pdf;base64,', '/etc/passwd', 'file:///C:/Windows/win.ini']) {
    const res = await upload(data);
    assert.ok([400, 415].includes(res.status), `${data} → ${res.status}`);
  }
});

test('oversized files → 413 FILE_TOO_LARGE', async () => {
  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1024 * 1024 + 10, 0x20)]);
  const res = await upload(dataUrl('application/pdf', big));
  assert.equal(res.status, 413);
  assert.ok(['FILE_TOO_LARGE', 'PAYLOAD_TOO_LARGE'].includes(res.json.error.code));
});

test('per-user storage quota is enforced', async () => {
  const other = await t.signIn('quota');
  const chunk = n => Buffer.concat([Buffer.from(`%PDF-1.4 ${n}\n`), Buffer.alloc(900 * 1024, 0x20)]);
  assert.equal((await upload(dataUrl('application/pdf', chunk(1)), 'a.pdf', other)).status, 201);
  assert.equal((await upload(dataUrl('application/pdf', chunk(2)), 'b.pdf', other)).status, 201);
  const third = await upload(dataUrl('application/pdf', chunk(3)), 'c.pdf', other);
  assert.equal(third.status, 413);
  assert.equal(third.json.error.code, 'STORAGE_QUOTA_EXCEEDED');
});

test('file names: traversal, absolute paths, null bytes and control characters are neutralized', () => {
  const cases = {
    '../../etc/passwd': 'passwd.pdf',
    '..\\..\\Windows\\win.ini': 'win.pdf',
    'C:\\Users\\victim\\a.pdf': 'a.pdf',
    '/abs/path/x.pdf': 'x.pdf',
    'evil.pdf\u0000.exe': 'evil.pdf.pdf',
    '....hidden': 'hidden.pdf',
    '....': 'attachment.pdf',
    'a<b>c:d"e|f?g*.pdf': 'a_b_c_d_e_f_g_.pdf',
    'report.exe': 'report.pdf',
    'محاضرة ١.pdf': 'محاضرة ١.pdf',
    '': 'attachment.pdf',
    ['x'.repeat(300) + '.pdf']: `${'x'.repeat(120)}.pdf`,
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(safeFileName(input, 'application/pdf'), expected, JSON.stringify(input));
  assert.equal(safeFileName('photo.pdf', 'image/png'), 'photo.png', 'extension always matches the verified type');
});

test('stored names are sanitized and downloads can never execute in our origin', async () => {
  const up = await upload(dataUrl('application/pdf', Buffer.from('%PDF-1.4 traversal')), '../../../../etc/<script>.pdf');
  assert.equal(up.status, 201);
  const meta = t.memory.collections.get('studyFiles.files').find(f => String(f._id) === up.json.id);
  assert.equal(meta.filename, '_script_.pdf');
  assert.equal(meta.metadata.userId, 'google-uploader');
  const res = await request(t.base, `/api/files/${up.json.id}`, { cookie });
  assert.match(res.headers.get('content-disposition'), /^attachment;/);
  assert.equal(res.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('decodeUpload unit checks', () => {
  assert.throws(() => decodeUpload('data:application/pdf;base64,' + 'A'.repeat(2_000_000), 1024), /large/i);
  assert.deepEqual(decodeUpload(dataUrl('application/pdf', PDF_BYTES), 1024).bytes, PDF_BYTES);
});

test('orphaned uploads are cleaned up after the grace period, referenced files are kept', async () => {
  let now = Date.now();
  const s = await startTestApp({ clock: () => now, env: { ORPHAN_FILE_GRACE_HOURS: '1' } });
  try {
    const c = await s.signIn('cleanup');
    const keep = (await request(s.base, '/api/files', { method: 'POST', cookie: c, body: { data: dataUrl('application/pdf', Buffer.from('%PDF-keep')), name: 'k.pdf' } })).json;
    const drop = (await request(s.base, '/api/files', { method: 'POST', cookie: c, body: { data: dataUrl('application/pdf', Buffer.from('%PDF-drop')), name: 'd.pdf' } })).json;
    // Backdate uploads beyond the grace period.
    for (const f of s.memory.collections.get('studyFiles.files')) f.uploadDate = new Date(now - 2 * 3_600_000);
    const data = { courses: [{ id: 'c', name: 'n', topics: [{ name: 't', pdf: { __cloudFile: keep.id, sha256: keep.sha256 } }] }], commitments: [] };
    assert.equal((await request(s.base, '/api/data', { method: 'PUT', cookie: c, body: { data } })).status, 200);
    await new Promise(r => setTimeout(r, 50));
    const ids = s.memory.collections.get('studyFiles.files').map(f => String(f._id));
    assert.ok(ids.includes(keep.id));
    assert.ok(!ids.includes(drop.id));
  } finally {
    await s.close();
  }
});
