export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

/** Pomodoro lengths in minutes; `cycles` = focus rounds before a long break. */
export interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  cycles: number;
}

/** The focus round that just finished — drives the completion screen. */
export interface CompletedRound {
  subject: string;
  topic: string;
  courseId: string | null;
  minutes: number;
  endedAt: number;
}

/** Persisted under localStorage `rafiq-pomodoro-v1` (older fields unchanged). */
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
  /** Course the current round belongs to (enables "mark lecture as studied"). */
  courseId?: string | null;
  lastCompleted?: CompletedRound | null;
}
