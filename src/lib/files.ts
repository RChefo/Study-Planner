import type { DataUrl } from '@/types';

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

/** Opens a stored PDF in a new tab. Returns false when the popup was blocked. */
export function openDataUrlInNewTab(data: DataUrl): boolean {
  const { mime, bytes } = dataUrlToBytes(data);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const tab = window.open(url, '_blank');
  if (!tab) {
    URL.revokeObjectURL(url);
    return false;
  }
  return true;
}
