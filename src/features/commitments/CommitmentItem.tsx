import type { Commitment } from '@/types';
import { dueLabel } from '@/lib/dates';
import { Hint, ListRow } from '@/components/ui/Surface';
import { MiniButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AttachmentActions } from '@/components/AttachmentActions';

interface CommitmentItemProps {
  commitment: Commitment;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CommitmentItem({ commitment: c, onToggleDone, onEdit, onDelete }: CommitmentItemProps) {
  return (
    <ListRow>
      <div>
        <b>
          {c.dueDate ? dueLabel(c.dueDate) : ''}
          {c.name}
        </b>
        {c.description && <Hint className="mt-1">{c.description}</Hint>}
        {c.pdf && <AttachmentActions data={c.pdf} fileName={c.pdfName} fallbackName="attachment.pdf" />}
      </div>
      <span className="flex shrink-0 items-start">
        {c.done ? (
          <MiniButton title="إرجاع لقيد التنفيذ" onClick={onToggleDone}>
            ↶ استعادة
          </MiniButton>
        ) : (
          <MiniButton title="تم الإنجاز" onClick={onToggleDone}>
            ✓ تم
          </MiniButton>
        )}
        <MiniButton aria-label="تعديل الالتزام" onClick={onEdit}>
          <Icon name="edit" size={15} />
        </MiniButton>
        <MiniButton aria-label="حذف الالتزام" onClick={onDelete}>
          <Icon name="close" size={15} />
        </MiniButton>
      </span>
    </ListRow>
  );
}
