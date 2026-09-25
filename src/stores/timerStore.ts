import { create } from 'zustand';
import type { TimerSettings, TimerState } from '@/types';
import { STORAGE_KEYS, readLocalJson, writeLocal } from '@/lib/storageKeys';

export const DEFAULT_TIMER: TimerState = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  cycles: 4,
  active: false,
  paused: false,
  mode: 'focus',
  endsAt: 0,
  startedAt: 0,
  subject: '',
  topic: '',
  sessionId: null,
  completed: 0,
};

/** Values typed in the timer setup form (kept as strings while editing). */
export interface TimerDraft {
  courseId: string;
  topic: string;
  focus: string;
  shortBreak: string;
  longBreak: string;
  cycles: string;
}

interface TimerStore {
  timer: TimerState;
  dockOpen: boolean;
  /** Updated every tick so clocks and the "today" stat re-render. */
  now: number;
  draft: TimerDraft;
  setTimer: (patch: Partial<TimerState>) => void;
  setDraft: (patch: Partial<TimerDraft>) => void;
  resetDraftSettings: () => void;
  setDockOpen: (open: boolean) => void;
  setNow: (now: number) => void;
}

const draftSettings = (s: TimerSettings) => ({
  focus: String(s.focus),
  shortBreak: String(s.shortBreak),
  longBreak: String(s.longBreak),
  cycles: String(s.cycles),
});

const initial: TimerState = { ...DEFAULT_TIMER, ...readLocalJson<Partial<TimerState>>(STORAGE_KEYS.timer, {}) };

export const useTimerStore = create<TimerStore>((set, get) => ({
  timer: initial,
  dockOpen: false,
  now: Date.now(),
  draft: { courseId: '', topic: '', ...draftSettings(initial) },
  setTimer: patch => {
    const timer = { ...get().timer, ...patch };
    writeLocal(STORAGE_KEYS.timer, JSON.stringify(timer));
    set({ timer, now: Date.now() });
  },
  setDraft: patch => set({ draft: { ...get().draft, ...patch } }),
  resetDraftSettings: () => set({ draft: { ...get().draft, ...draftSettings(get().timer) } }),
  setDockOpen: dockOpen => set({ dockOpen }),
  setNow: now => set({ now }),
}));

export const timerState = () => useTimerStore.getState().timer;

export const pickTimerSettings = (t: TimerSettings): TimerSettings => ({
  focus: t.focus,
  shortBreak: t.shortBreak,
  longBreak: t.longBreak,
  cycles: t.cycles,
});
