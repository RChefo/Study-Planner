import type { DataUrl } from '@/types';
import { parseAttachment, safeDownloadName } from './attachments';

export function blobToDataUrl(blob: Blob): Promise<DataUrl> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function dataUrlToBytes(data: DataUrl): { mime: string; bytes: Uint8Array<ArrayBuffer> } {
  const comma = data.indexOf(',');
  const header = data.slice(0, comma);
  const mime = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/pdf';
  const binary = atob(data.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Opens a stored attachment in a new tab. The blob type is the *verified* type — never the
 * type claimed by the data URL — so a crafted `data:text/html` value can't become a page.
 */
export function openAttachmentInNewTab(data: unknown): 'opened' | 'blocked' | 'invalid' {
  const parsed = parseAttachment(data);
  if (!parsed) return 'invalid';
  const url = URL.createObjectURL(new Blob([parsed.bytes], { type: parsed.mime }));
  const tab = window.open(url, '_blank');
  if (!tab) {
    URL.revokeObjectURL(url);
    return 'blocked';
  }
  tab.opener = null;
  // Give the new tab time to load the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'opened';
}

/** Saves a verified attachment to disk under a sanitized name. */
export function downloadAttachment(data: unknown, name: unknown): boolean {
  const parsed = parseAttachment(data);
  if (!parsed) return false;
  const url = URL.createObjectURL(new Blob([parsed.bytes], { type: parsed.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = safeDownloadName(name, parsed.mime);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
