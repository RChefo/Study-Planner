import { useEffect } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { timerTick } from './timerController';

/** Drives the pomodoro clock while the dashboard is open. */
export function useTimerEngine() {
  const running = useTimerStore(s => s.timer.active && !s.timer.paused);

  useEffect(() => {
    if (!running) return;
    timerTick();
    const id = setInterval(timerTick, 500);
    return () => clearInterval(id);
  }, [running]);
}
