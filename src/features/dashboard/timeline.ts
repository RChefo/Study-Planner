/**
 * Today's timeline, built only from real data: focus rounds already logged, the round
 * running now, and today's university classes. Pure (pass `now`), so it is unit-tested.
 */
import type { StudyLogEntry, TimerState } from '../../types/index.ts';
import type { ClockRange } from '../timetable/classTimes.ts';
import { atMinutes } from '../timetable/classTimes.ts';
import { dayKey } from '../insights/selectors.ts';

export type TimelineState = 'done' | 'now' | 'upcoming';

export interface TimelineItem {
  id: string;
  kind: 'study' | 'class' | 'focus';
  start: number;
  end: number | null;
  title: string;
  detail: string;
  state: TimelineState;
  /** Study rounds: finished normally (vs stopped early). */
  completed?: boolean;
  minutes?: number;
  /** Classes: room / instructor. */
  room?: string;
  instructor?: string;
}

/** The subset of a timetable class the timeline needs. */
export interface TimelineClass {
  key: string;
  title: string;
  range: ClockRange | null;
  room: string;
  instructor: string;
}

export function buildTodayTimeline({
  log,
  classes,
  timer,
  now,
}: {
  log: StudyLogEntry[];
  classes: TimelineClass[];
  timer: Pick<TimerState, 'active' | 'mode' | 'startedAt' | 'subject' | 'topic'> | null;
  now: number;
}): TimelineItem[] {
  const today = dayKey(now);
  const items: TimelineItem[] = [];

  for (const l of log) {
    if (dayKey(l.startedAt) !== today) continue;
    items.push({
      id: l.id,
      kind: 'study',
      start: l.startedAt,
      end: l.endedAt,
      title: l.subject,
      detail: l.topic,
      state: 'done',
      completed: l.completed,
      minutes: Number(l.duration) || 0,
    });
  }

  if (timer?.active && timer.mode === 'focus' && timer.startedAt) {
    items.push({ id: `focus-${timer.startedAt}`, kind: 'focus', start: timer.startedAt, end: null, title: timer.subject, detail: timer.topic, state: 'now' });
  }

  for (const c of classes) {
    if (!c.range) continue;
    const start = atMinutes(now, c.range.start);
    const end = atMinutes(now, c.range.end);
    items.push({
      id: `class-${c.key}`,
      kind: 'class',
      start,
      end,
      title: c.title,
      detail: '',
      room: c.room,
      instructor: c.instructor,
      state: end <= now ? 'done' : start <= now ? 'now' : 'upcoming',
    });
  }

  return items.sort((a, b) => a.start - b.start);
}

/** Index where the "now" line belongs: before the first item that starts in the future. */
export function nowIndex(items: TimelineItem[], now: number): number {
  const i = items.findIndex(item => item.start > now);
  return i < 0 ? items.length : i;
}
