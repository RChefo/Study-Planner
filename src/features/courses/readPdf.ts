import { blobToDataUrl, isPdfFile } from '@/lib/files';
import { isSafeAttachment } from '@/lib/attachments';

/** Client-side limit that matches the server default (MAX_UPLOAD_MB=40). */
export const MAX_PDF_MB = 40;

/** Reads a user-chosen PDF into a verified data URL, or returns a user-facing error. */
export async function readPdf(file: File): Promise<{ data: string } | { error: string }> {
  if (!isPdfFile(file)) return { error: 'اختر ملفًا بصيغة PDF' };
  if (file.size > MAX_PDF_MB * 1024 * 1024) return { error: `حجم الملف أكبر من ${MAX_PDF_MB} ميجابايت` };
  let data: string;
  try {
    data = await blobToDataUrl(file);
  } catch {
    return { error: 'تعذرت قراءة الملف؛ جرّب مرة أخرى' };
  }
  // Some systems report an empty/odd MIME type; normalize the header, then verify the bytes.
  data = data.replace(/^data:[^;,]*;base64,/, 'data:application/pdf;base64,');
  if (!isSafeAttachment(data)) return { error: 'هذا الملف ليس PDF صالحًا' };
  return { data };
}
