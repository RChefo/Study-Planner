import type { DataUrl } from '@/types';
import { previewAttachment, saveAttachment } from './previewAttachment';
import { Icon } from './ui/Icon';
import { Button, MiniButton } from './ui/Button';

/**
 * Preview + download controls for a stored PDF. Both go through verified blobs — the raw
 * data URL is never used as a link target.
 */
export function AttachmentActions({ data, fileName, fallbackName, compact }: { data: DataUrl; fileName?: string; fallbackName: string; compact?: boolean }) {
  if (compact) {
    return (
      <>
        <MiniButton onClick={() => previewAttachment(data)}>
          <Icon name="eye" size={15} /> معاينة
        </MiniButton>
        <MiniButton className="text-brand" onClick={() => saveAttachment(data, fileName || fallbackName)}>
          <Icon name="download" size={15} /> تنزيل
        </MiniButton>
      </>
    );
  }
  return (
    <div className="mt-[9px] flex flex-wrap gap-2">
      <Button size="sm" className="text-brand" onClick={() => previewAttachment(data)}>
        <Icon name="eye" size={15} /> معاينة وفتح
      </Button>
      <Button size="sm" className="text-brand" onClick={() => saveAttachment(data, fileName || fallbackName)}>
        <Icon name="download" size={15} /> تنزيل PDF
      </Button>
      <span className="self-center text-xs leading-[1.7] text-muted">{fileName || 'ملف PDF'}</span>
    </div>
  );
}
