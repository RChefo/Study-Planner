import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button. */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

interface UiState {
  toastMessage: string;
  toastTone: ToastTone;
  toastVisible: boolean;
  toastId: number;
  confirmRequest: ConfirmRequest | null;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
  requestConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  settleConfirm: (ok: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Very small heuristic so existing call sites get the right tone without changes. */
function inferTone(message: string): ToastTone {
  if (/تعذر|تعذّر|غير صالح|فشل|امتلأت|خطأ|لا يمكن/.test(message)) return 'error';
  if (/تم |تمت |أحسنت|مبروك|بدأ/.test(message)) return 'success';
  return 'info';
}

export const useUiStore = create<UiState>((set, get) => ({
  toastMessage: '',
  toastTone: 'info',
  toastVisible: false,
  toastId: 0,
  confirmRequest: null,
  showToast: (message, tone) => {
    clearTimeout(toastTimer);
    const resolved = tone ?? inferTone(message);
    set({ toastMessage: message, toastTone: resolved, toastVisible: true, toastId: get().toastId + 1 });
    toastTimer = setTimeout(() => set({ toastVisible: false }), resolved === 'error' ? 5000 : 3000);
  },
  hideToast: () => {
    clearTimeout(toastTimer);
    set({ toastVisible: false });
  },
  requestConfirm: (message, options = {}) =>
    new Promise<boolean>(resolve => {
      get().confirmRequest?.resolve(false);
      set({ confirmRequest: { message, resolve, ...options } });
    }),
  settleConfirm: ok => {
    get().confirmRequest?.resolve(ok);
    set({ confirmRequest: null });
  },
}));

/** Non-React helpers for services and controllers. */
export const toast = (message: string, tone?: ToastTone) => useUiStore.getState().showToast(message, tone);
export const confirmAction = (message: string, options?: ConfirmOptions) => useUiStore.getState().requestConfirm(message, options);
