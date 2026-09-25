/**
 * Regression tests for FINDING #5 (medium): a crafted backup could carry a `data:text/html`
 * "attachment"; previewing it created a same-origin blob page and ran attacker script with
 * the user's session. Attachments are now type- and content-verified before any use.
 *
 * Runs with Node's built-in TypeScript support (no extra dependencies).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAttachment, isSafeAttachment, safeDownloadName, stripUnsafeAttachments } from '../../src/lib/attachments.ts';

const b64 = (s: string | Uint8Array) => Buffer.from(s).toString('base64');
const PDF = `data:application/pdf;base64,${b64('%PDF-1.4\n%%EOF')}`;
const PNG = `data:image/png;base64,${b64(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))}`;

test('valid PDF and PNG attachments are accepted with their verified type', () => {
  assert.equal(parseAttachment(PDF)?.mime, 'application/pdf');
  assert.equal(parseAttachment(PNG)?.mime, 'image/png');
});

test('script-capable or unknown types are rejected (XSS regression)', () => {
  const html = b64('<script>fetch("/api/data")</script>');
  for (const value of [
    `data:text/html;base64,${html}`,
    `data:image/svg+xml;base64,${b64('<svg onload=alert(1)>')}`,
    `data:application/xhtml+xml;base64,${html}`,
    `data:application/javascript;base64,${b64('alert(1)')}`,
    `data:application/octet-stream;base64,${html}`,
    'javascript:alert(1)',
    'https://evil.example/a.pdf',
    `data:text/html,<script>alert(1)</script>`,
  ]) {
    assert.equal(isSafeAttachment(value), false, value.slice(0, 40));
  }
});

test('declared PDF whose bytes are HTML is rejected (content sniffing regression)', () => {
  assert.equal(isSafeAttachment(`data:application/pdf;base64,${b64('<html><script>alert(1)</script>')}`), false);
  assert.equal(isSafeAttachment(`data:image/png;base64,${b64('%PDF-1.4')}`), false);
});

test('malformed payloads and non-strings are rejected', () => {
  for (const value of [undefined, null, 42, {}, 'data:application/pdf;base64,', 'data:application/pdf;base64,@@@', 'data:application/pdf;base64,A']) {
    assert.equal(isSafeAttachment(value), false, String(value));
  }
});

test('download names cannot carry paths or misleading extensions', () => {
  assert.equal(safeDownloadName('../../evil.html', 'application/pdf'), 'evil.pdf');
  assert.equal(safeDownloadName('C:\\x\\report.exe', 'application/pdf'), 'report.pdf');
  assert.equal(safeDownloadName('a\u0000b.pdf', 'image/png'), 'ab.png');
  assert.equal(safeDownloadName('', 'application/pdf'), 'attachment.pdf');
  assert.equal(safeDownloadName('محاضرة ١.pdf', 'application/pdf'), 'محاضرة ١.pdf');
});

test('stripUnsafeAttachments removes only unsafe attachments', () => {
  const data = {
    courses: [{ topics: [{ name: 'ok', pdf: PDF, pdfName: 'a.pdf' }, { name: 'bad', pdf: 'data:text/html;base64,PHNjcmlwdD4=', pdfName: 'x.pdf' }, { name: 'none' }] }],
    commitments: [{ name: 'k', pdf: 'javascript:alert(1)' }],
  };
  const { data: clean, removed } = stripUnsafeAttachments(data);
  assert.equal(removed, 2);
  assert.equal(clean.courses[0].topics![0].pdf, PDF);
  assert.equal('pdf' in clean.courses[0].topics![1], false);
  assert.equal('pdfName' in clean.courses[0].topics![1], false);
  assert.equal('pdf' in clean.commitments[0], false);
  assert.notEqual(clean, data, 'input is not mutated');
  assert.equal(data.commitments[0].pdf, 'javascript:alert(1)');
});
