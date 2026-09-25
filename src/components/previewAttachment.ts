import { downloadAttachment, openAttachmentInNewTab } from '@/lib/files';
import { toast } from '@/stores/uiStore';

/** Opens a stored attachment in a new tab (verified PDF/image only). */
export function previewAttachment(data: unknown) {
  const result = openAttachmentInNewTab(data);
  if (result === 'invalid') toast('هذا المرفق غير صالح أو ليس ملف PDF/صورة، فلن يتم فتحه');
  else if (result === 'blocked') toast('اسمح بفتح تبويب جديد لعرض الملف');
}

/** Downloads a stored attachment under a safe file name. */
export function saveAttachment(data: unknown, name: unknown) {
  if (!downloadAttachment(data, name)) toast('هذا المرفق غير صالح أو ليس ملف PDF/صورة، فلن يتم تنزيله');
}
