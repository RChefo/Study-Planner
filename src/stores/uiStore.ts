import { create } from 'zustand';

interface ConfirmRequest {
  message: string;
  resolve: (ok: boolean) => void;
}

interface UiState {
  toastMessage: string;
  toastVisible: boolean;
  confirmRequest: ConfirmRequest | null;
  showToast: (message: string) => void;
  requestConfirm: (message: string) => Promise<boolean>;
  settleConfirm: (ok: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>((set, get) => ({
  toastMessage: '',
  toastVisible: false,
  confirmRequest: null,
  showToast: message => {
    clearTimeout(toastTimer);
    set({ toastMessage: message, toastVisible: true });
    toastTimer = setTimeout(() => set({ toastVisible: false }), 2300);
  },
  requestConfirm: message =>
    new Promise<boolean>(resolve => {
      get().confirmRequest?.resolve(false);
      set({ confirmRequest: { message, resolve } });
    }),
  settleConfirm: ok => {
    get().confirmRequest?.resolve(ok);
    set({ confirmRequest: null });
  },
}));

/** Non-React helpers for services and controllers. */
export const toast = (message: string) => useUiStore.getState().showToast(message);
export const confirmAction = (message: string) => useUiStore.getState().requestConfirm(message);
