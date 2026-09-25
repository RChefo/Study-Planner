import type { DataUrl } from '@/types';
import { openDataUrlInNewTab } from '@/lib/files';
import { toast } from '@/stores/uiStore';

/** Opens a stored PDF in a new browser tab, with the original error messages. */
export function previewAttachment(data: DataUrl | undefined) {
  if (!data) return toast('ملف PDF غير متاح');
  try {
    if (!openDataUrlInNewTab(data)) toast('اسمح بفتح تبويب جديد لعرض الملف');
  } catch {
    toast('تعذرت معاينة الملف؛ جرّب تنزيله وفتحه');
  }
}
