/**
 * Attachment safety. Attachments are stored inline as `data:` URLs; anything that enters the
 * app (Excel import, cloud download, local storage) is validated here before it can be
 * previewed or downloaded. Only PDF and common images are allowed, and the content must
 * match the declared type — a `data:text/html` "PDF" must never become a same-origin page.
 *
 * Pure module (no DOM/app imports) so it can be unit-tested with plain Node.
 */

export const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

/** Hard cap on a single inline attachment (the server enforces its own, smaller, limit). */
export const MAX_ATTACHMENT_BYTES = 60 * 1024 * 1024;

const HEADER = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

function magicMatches(mime: AttachmentType, b: Uint8Array): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.subarray(start, end));
  switch (mime) {
    case 'application/pdf':
      return ascii(0, 5) === '%PDF-';
    case 'image/png':
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v);
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  }
}

export interface ParsedAttachment {
  mime: AttachmentType;
  bytes: Uint8Array<ArrayBuffer>;
}

/** Returns the verified type and bytes, or null if the value is not a safe attachment. */
export function parseAttachment(value: unknown): ParsedAttachment | null {
  if (typeof value !== 'string' || value.length > MAX_ATTACHMENT_BYTES * 1.4) return null;
  const header = HEADER.exec(value);
  const mime = header?.[1].toLowerCase() as AttachmentType | undefined;
  if (!header || !mime || !ATTACHMENT_TYPES.includes(mime)) return null;
  const payload = value.slice(header[0].length);
  if (!payload || payload.length % 4 === 1 || !BASE64.test(payload)) return null;
  let binary: string;
  try {
    binary = atob(payload);
  } catch {
    return null;
  }
  if (!binary.length || binary.length > MAX_ATTACHMENT_BYTES) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return magicMatches(mime, bytes) ? { mime, bytes } : null;
}

export const isSafeAttachment = (value: unknown): value is string => parseAttachment(value) !== null;

/** Display name for downloads: no path parts, control/reserved characters; extension matches the type. */
export function safeDownloadName(name: unknown, mime: AttachmentType): string {
  const ext = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[mime];
  const raw = typeof name === 'string' ? name : '';
  const clean = [...raw].filter(ch => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f).join('');
  const base = (clean.split(/[\\/]/).pop() ?? '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^[.\s]+/, '')
    .replace(/\.[A-Za-z0-9]{1,10}$/, '')
    .trim()
    .slice(0, 120);
  return `${base || 'attachment'}${ext}`;
}

interface WithAttachment {
  pdf?: unknown;
  pdfName?: unknown;
}

/**
 * Removes attachments that are not safe from planner data (in place on a copy).
 * Returns the cleaned value and how many attachments were dropped.
 */
export function stripUnsafeAttachments<T extends { courses: Array<{ topics?: WithAttachment[] }>; commitments: WithAttachment[] }>(data: T): { data: T; removed: number } {
  let removed = 0;
  const clean = <A extends WithAttachment>(item: A): A => {
    if (item.pdf === undefined || isSafeAttachment(item.pdf)) return item;
    removed++;
    const { pdf: _pdf, pdfName: _name, ...rest } = item;
    return rest as A;
  };
  const courses = data.courses.map(c => (c.topics ? { ...c, topics: c.topics.map(clean) } : c));
  const commitments = data.commitments.map(clean);
  return { data: { ...data, courses, commitments }, removed };
}
