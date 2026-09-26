/** Groups commitments the way a student reads them: what's late, today, soon, later. Pure. */
import type { Commitment } from '../../types/index.ts';
import { dueInfo, type DueInfo } from '../insights/selectors.ts';

export type DueGroupId = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export interface DueGroup {
  id: DueGroupId;
  items: Array<{ commitment: Commitment; due: DueInfo }>;
}

const ORDER: DueGroupId[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];

const groupOf = (due: DueInfo): DueGroupId => (due.state === 'soon' ? 'week' : due.state);

/** Open commitments in urgency order, grouped; empty groups are dropped. */
export function groupOpenCommitments(commitments: Commitment[], now: number): DueGroup[] {
  const groups = new Map<DueGroupId, DueGroup['items']>();
  for (const commitment of commitments) {
    if (commitment.done) continue;
    const due = dueInfo(commitment.dueDate, now);
    const id = groupOf(due);
    groups.set(id, [...(groups.get(id) ?? []), { commitment, due }]);
  }
  return ORDER.filter(id => groups.has(id)).map(id => ({
    id,
    items: groups.get(id)!.sort((a, b) => (a.due.days ?? 0) - (b.due.days ?? 0) || a.commitment.name.localeCompare(b.commitment.name)),
  }));
}

/** Completed commitments, most recent due date first (undated last). */
export function completedCommitments(commitments: Commitment[]): Commitment[] {
  return commitments.filter(c => c.done).sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
}
