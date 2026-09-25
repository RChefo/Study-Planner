export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

/** Pomodoro lengths in minutes; `cycles` = focus rounds before a long break. */
export interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  cycles: number;
}

/** Persisted under localStorage `rafiq-pomodoro-v1` (same shape as before). */
export interface TimerState extends TimerSettings {
  active: boolean;
  paused: boolean;
  mode: TimerMode;
  endsAt: number;
  startedAt: number;
  subject: string;
  topic: string;
  sessionId: string | null;
  completed: number;
  remainingMs?: number;
}
