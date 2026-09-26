import { useEffect } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { timerTick } from './timerController';

const LOCK_NAME = 'study-planner-timer';

/**
 * Drives the pomodoro clock. Every tab refreshes its own display, but only ONE tab (the
 * holder of a Web Lock) performs transitions such as logging a finished focus round — so
 * several open tabs can never double-log. Exactly one interval exists per role per tab;
 * effect cleanup removes it on unmount/rerender (no duplicate timers).
 */
export function useTimerEngine() {
  const running = useTimerStore(s => s.timer.active && !s.timer.paused);
  const setNow = useTimerStore(s => s.setNow);

  // Display refresh (every tab): twice a second while running; every 30 s when idle so
  // "today" figures roll over at midnight on a dashboard left open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), running ? 500 : 30_000);
    return () => clearInterval(id);
  }, [running, setNow]);

  // Transitions (leader tab only; falls back to every tab where Web Locks are unavailable,
  // in which case idempotent log ids still prevent duplicates).
  useEffect(() => {
    if (!running) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const lead = () => {
      timerTick();
      interval = setInterval(timerTick, 500);
    };
    // Background tabs are throttled; catch up as soon as the tab is visible again.
    const onVisible = () => document.visibilityState === 'visible' && interval && timerTick();
    document.addEventListener('visibilitychange', onVisible);

    const abort = new AbortController();
    let release: (() => void) | undefined;
    if (navigator.locks?.request) {
      navigator.locks
        .request(LOCK_NAME, { signal: abort.signal }, () => {
          lead();
          return new Promise<void>(resolve => {
            release = resolve;
          });
        })
        .catch(() => {
          /* aborted while waiting for the lock — another tab leads */
        });
    } else {
      lead();
    }

    return () => {
      abort.abort();
      clearInterval(interval);
      release?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running]);
}
