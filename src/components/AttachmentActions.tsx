import type { DataUrl } from '@/types';
import { previewAttachment } from './previewAttachment';
import { Icon } from './ui/Icon';
import { ButtonLink, Button, MiniButton } from './ui/Button';

/** Preview + download controls for a stored PDF. `compact` = inline lecture-row style. */
export function AttachmentActions({ data, fileName, fallbackName, compact }: { data: DataUrl; fileName?: string; fallbackName: string; compact?: boolean }) {
  if (compact) {
    return (
      <>
        <MiniButton onClick={() => previewAttachment(data)}>
          <Icon name="eye" size={15} /> معاينة
        </MiniButton>
        <a className="inline-flex items-center gap-1 px-[5px] py-[2px] text-[13px] text-brand" download={fileName || fallbackName} href={data}>
          <Icon name="download" size={15} /> تنزيل
        </a>
      </>
    );
  }
  return (
    <div className="mt-[9px] flex flex-wrap gap-2">
      <Button size="sm" className="text-brand" onClick={() => previewAttachment(data)}>
        <Icon name="eye" size={15} /> معاينة وفتح
      </Button>
      <ButtonLink size="sm" className="text-brand" download={fileName || fallbackName} href={data}>
        <Icon name="download" size={15} /> تنزيل PDF
      </ButtonLink>
      <span className="self-center text-xs leading-[1.7] text-muted">{fileName || 'ملف PDF'}</span>
    </div>
  );
}
