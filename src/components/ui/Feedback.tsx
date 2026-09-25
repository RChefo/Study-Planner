import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Dialog, DialogActions } from './Dialog';

export function Toast() {
  const message = useUiStore(s => s.toastMessage);
  const visible = useUiStore(s => s.toastVisible);
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#203b31] px-[17px] py-[11px] text-white',
        !visible && 'hidden',
      )}
    >
      {message}
    </div>
  );
}

/** Replaces window.confirm() with an accessible in-app dialog. */
export function ConfirmDialog() {
  const request = useUiStore(s => s.confirmRequest);
  const settle = useUiStore(s => s.settleConfirm);
  return (
    <Dialog open={!!request} onClose={() => settle(false)} title="تأكيد" elevated className="w-[min(420px,100%)]">
      <p className="m-0 text-sm leading-[1.8]">{request?.message}</p>
      <DialogActions>
        <Button onClick={() => settle(false)}>إلغاء</Button>
        <Button variant="primary" onClick={() => settle(true)}>
          تأكيد
        </Button>
      </DialogActions>
    </Dialog>
  );
}
