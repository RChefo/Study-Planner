import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTimerStore } from '@/stores/timerStore';
import { timerTick } from './timerController';

/** Drives the pomodoro clock once the app has started (auth gate dismissed). */
export function useTimerEngine() {
  const started = useAuthStore(s => s.started);
  const running = useTimerStore(s => s.timer.active && !s.timer.paused);

  useEffect(() => {
    if (!started || !running) return;
    timerTick();
    const id = setInterval(timerTick, 500);
    return () => clearInterval(id);
  }, [started, running]);
}
