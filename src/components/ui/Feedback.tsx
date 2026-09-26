import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Dialog, DialogActions } from './Dialog';
import { Icon } from './Icon';

const TONE = {
  success: { icon: 'checkCircle', className: 'bg-[#17362c] text-white', iconClass: 'text-[#8fd6b3]' },
  error: { icon: 'alert', className: 'bg-[#3a1d17] text-white', iconClass: 'text-[#ffb4a3]' },
  info: { icon: 'bell', className: 'bg-[#1f2a27] text-white', iconClass: 'text-[#c5dcd1]' },
} as const;

/** Single live-region toast (errors stay longer). Announced politely; errors assertively. */
export function Toast() {
  const message = useUiStore(s => s.toastMessage);
  const tone = useUiStore(s => s.toastTone);
  const visible = useUiStore(s => s.toastVisible);
  const id = useUiStore(s => s.toastId);
  const hide = useUiStore(s => s.hideToast);
  const t = TONE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 max-lg:bottom-24"
    >
      {visible && (
        <div
          key={id}
          className={cn('pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-[0_12px_32px_-8px_#0008] motion-safe:animate-fade-up', t.className)}
        >
          <Icon name={t.icon} size={17} className={cn('mt-0.5', t.iconClass)} />
          <span className="leading-relaxed">{message}</span>
          <button type="button" onClick={hide} aria-label="إغلاق التنبيه" className="-me-1 rounded p-0.5 text-white/70 hover:text-white">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Replaces window.confirm() with an accessible in-app dialog. */
export function ConfirmDialog() {
  const request = useUiStore(s => s.confirmRequest);
  const settle = useUiStore(s => s.settleConfirm);
  return (
    <Dialog open={!!request} onClose={() => settle(false)} title={request?.title ?? 'تأكيد'} elevated className="w-[min(440px,100%)]">
      <p className="m-0 text-sm leading-[1.8] text-ink">{request?.message}</p>
      <DialogActions>
        <Button onClick={() => settle(false)}>{request?.cancelLabel ?? 'إلغاء'}</Button>
        <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
          {request?.confirmLabel ?? 'تأكيد'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
