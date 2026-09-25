import type { PlannerData } from '@/types';

/**
 * Same-origin tab-to-tab messages (BroadcastChannel). Posting only — listeners live in
 * features/sync/tabSync.ts so this module has no store imports (avoids import cycles).
 */

export type TabMessage =
  | { type: 'planner'; from: string; data: PlannerData }
  | { type: 'signed-out'; from: string };

export const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());

let channel: BroadcastChannel | null = null;
export function tabChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel('study-planner');
  return channel;
}

export function broadcastPlanner(data: PlannerData): void {
  try {
    tabChannel()?.postMessage({ type: 'planner', from: TAB_ID, data } satisfies TabMessage);
  } catch {
    /* structured-clone failure or closed channel — other tabs will catch up on reload */
  }
}

export function broadcastSignedOut(): void {
  tabChannel()?.postMessage({ type: 'signed-out', from: TAB_ID } satisfies TabMessage);
}
