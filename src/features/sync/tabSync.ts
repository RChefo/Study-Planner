import type { TimerState } from '@/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { normalizePlannerData } from '@/lib/plannerData';
import { TAB_ID, tabChannel, type TabMessage } from '@/services/tabChannel';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { authState, patchAuth } from '@/stores/authStore';

/**
 * Keeps several open tabs consistent:
 * - planner edits saved in one tab replace the (otherwise stale) copy in the others,
 *   so an old tab can't overwrite newer data on its next save;
 * - timer state follows localStorage changes made by another tab;
 * - signing out in one tab signs out the others.
 */
let started = false;

export function startTabSync(): void {
  if (started) return;
  started = true;

  tabChannel()?.addEventListener('message', (event: MessageEvent<TabMessage>) => {
    const msg = event.data;
    if (!msg || msg.from === TAB_ID) return;
    if (msg.type === 'planner') usePlannerStore.getState().replace(normalizePlannerData(msg.data));
    if (msg.type === 'signed-out' && authState().user) patchAuth({ user: null, cloudReady: false, status: 'anonymous', notice: null });
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEYS.timer || !event.newValue) return;
    try {
      const timer = JSON.parse(event.newValue) as TimerState;
      useTimerStore.setState({ timer, now: Date.now() });
    } catch {
      /* ignore malformed values */
    }
  });
}
