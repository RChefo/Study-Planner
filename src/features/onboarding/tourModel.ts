/**
 * The guided tour, as pure data and functions (no DOM, no React) so it can be unit-tested:
 * the steps, when the tour opens by itself, step navigation, target lookup and popover
 * placement. Targets are stable `data-tour` attributes on the real UI, never pixel positions.
 */
import type { OnboardingStatus } from '../../types/planner.ts';
import { ROUTES } from '../../routes/paths.ts';

export interface TourStep {
  id: string;
  route: string;
  /** `data-tour` value of the element to spotlight (null = centred card, no spotlight). */
  target: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'today', route: ROUTES.app, target: 'today', title: 'يومك يبدأ من هنا', body: 'صفحة «اليوم» نقطة بدايتك: ما تذاكره الآن، ومحاضراتك الجامعية، وما يستحق التسليم.' },
  { id: 'path', route: ROUTES.app, target: 'path', title: 'مسارك الدراسي', body: 'تنقّل بين أقسام Study Planner من هذا المسار؛ النقطة الذهبية تُريك أين أنت.' },
  { id: 'courses', route: ROUTES.courses, target: 'page-header', title: 'موادك', body: 'أضف كل مادة ثم محاضراتها؛ فتصبح المادة مسارًا تتقدّم فيه محاضرةً بعد محاضرة.' },
  { id: 'timetable', route: ROUTES.timetable, target: 'page-header', title: 'جدولك الجامعي', body: 'اختر مجموعتك لترى محاضرات الأسبوع، وتظهر محاضرات اليوم في صفحة «اليوم» تلقائيًا.' },
  { id: 'commitments', route: ROUTES.commitments, target: 'page-header', title: 'الالتزامات', body: 'سجّل التكليفات والاختبارات ومواعيد التسليم، ونرتّبها لك حسب الأقرب.' },
  { id: 'progress', route: ROUTES.stats, target: 'page-header', title: 'تقدّمك', body: 'هنا صورة عاداتك: وقت المذاكرة والسلسلة وإنجاز المواد. وكل جولة محفوظة في «سجل المذاكرة».' },
  { id: 'focus', route: ROUTES.app, target: 'focus', title: 'جولة تركيز', body: 'ابدأ جولة تركيز في أي وقت؛ يُحفظ وقتك تلقائيًا ويرتبط بالمادة والمحاضرة التي تذاكرها.' },
  { id: 'done', route: ROUTES.app, target: 'help', title: 'أنت جاهز', body: 'يمكنك إعادة هذه الجولة في أي وقت من زر الدليل «؟» في الأعلى.' },
];

/** Opens by itself only once the student's data is loaded and they have never finished or skipped it. */
export function shouldAutoStart(input: {
  status: 'loading' | 'authenticated' | 'local' | 'anonymous';
  cloudReady: boolean;
  onboarding: { status: OnboardingStatus } | undefined;
  startedThisSession: boolean;
}): boolean {
  const ready = input.status === 'local' || (input.status === 'authenticated' && input.cloudReady);
  return ready && !input.onboarding && !input.startedThisSession;
}

export interface TourState {
  active: boolean;
  index: number;
}

export type TourAction = { type: 'start' } | { type: 'next' } | { type: 'prev' } | { type: 'close' };

export function tourReducer(state: TourState, action: TourAction, total: number): TourState {
  switch (action.type) {
    case 'start':
      return { active: true, index: 0 };
    case 'next':
      return state.active ? { ...state, index: Math.min(total - 1, state.index + 1) } : state;
    case 'prev':
      return state.active ? { ...state, index: Math.max(0, state.index - 1) } : state;
    case 'close':
      return { active: false, index: 0 };
  }
}

/**
 * Resolves a tour target, waiting for it to appear (after a route change or lazy load).
 * Never throws: a target that doesn't show up within `timeout` resolves to null and the
 * step is shown as a centred card instead.
 */
export async function waitForTarget<T>(query: () => T | null, opts: { timeout?: number; interval?: number; sleep?: (ms: number) => Promise<void>; now?: () => number } = {}): Promise<T | null> {
  const { timeout = 2500, interval = 60, sleep = ms => new Promise(r => setTimeout(r, ms)), now = () => Date.now() } = opts;
  const start = now();
  for (;;) {
    let found: T | null;
    try {
      found = query();
    } catch {
      found = null;
    }
    if (found) return found;
    if (now() - start >= timeout) return null;
    await sleep(interval);
  }
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placement =
  | { mode: 'anchored'; side: 'bottom' | 'top' | 'start' | 'end'; x: number; y: number }
  | { mode: 'sheet'; edge: 'top' | 'bottom'; x: number; y: number; w: number }
  | { mode: 'center'; x: number; y: number };

/** Below this width the popover becomes a compact sheet docked to the edge away from the target. */
export const SHEET_BELOW = 640;

const overlaps = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Where the popover goes: next to the target if there is room that stays inside the
 * viewport and clears the target and fixed UI (header, footer path, Focus control);
 * otherwise a sheet on the edge away from the target; centred when there is no target.
 */
export function placePopover(input: { target: Rect | null; pop: { w: number; h: number }; viewport: { w: number; h: number }; obstacles?: Rect[]; rtl?: boolean; gap?: number; margin?: number }): Placement {
  const { target, pop, viewport, obstacles = [], rtl = true, gap = 14, margin = 12 } = input;
  const fits = (r: Rect) =>
    r.x >= margin && r.y >= margin && r.x + r.w <= viewport.w - margin && r.y + r.h <= viewport.h - margin && !obstacles.some(o => overlaps(r, o, 4)) && !(target && overlaps(r, target, 6));

  if (!target) {
    return { mode: 'center', x: Math.round((viewport.w - pop.w) / 2), y: Math.round(clamp((viewport.h - pop.h) / 2, margin, viewport.h - pop.h - margin)) };
  }

  if (viewport.w >= SHEET_BELOW) {
    const cx = clamp(target.x + target.w / 2 - pop.w / 2, margin, viewport.w - pop.w - margin);
    const cy = clamp(target.y + target.h / 2 - pop.h / 2, margin, viewport.h - pop.h - margin);
    const after = target.x + target.w + gap; // physical right of the target
    const before = target.x - gap - pop.w; // physical left of the target
    const candidates: Array<{ side: 'bottom' | 'top' | 'start' | 'end'; x: number; y: number }> = [
      { side: 'bottom', x: cx, y: target.y + target.h + gap },
      { side: 'top', x: cx, y: target.y - gap - pop.h },
      // RTL: the end side (reading onward) is on the left, the start side on the right.
      { side: 'end', x: rtl ? before : after, y: cy },
      { side: 'start', x: rtl ? after : before, y: cy },
    ];
    const hit = candidates.find(c => fits({ x: c.x, y: c.y, w: pop.w, h: pop.h }));
    if (hit) return { mode: 'anchored', side: hit.side, x: Math.round(hit.x), y: Math.round(hit.y) };
  }

  // Sheet: full width on phones (capped on larger screens), on the edge away from the target.
  // Preferably clear of fixed UI at that edge; if the target is too tall for that, the sheet may
  // sit over (dimmed) fixed UI rather than over the element being explained.
  const w = Math.min(viewport.w - margin * 2, 460);
  const x = Math.round((viewport.w - w) / 2);
  const topLimit = Math.max(margin, ...obstacles.filter(o => o.y + o.h <= viewport.h / 2).map(o => o.y + o.h + 8));
  const bottomLimit = Math.min(viewport.h - margin, ...obstacles.filter(o => o.y >= viewport.h / 2).map(o => o.y - 8));
  const away: 'top' | 'bottom' = target.y + target.h / 2 > viewport.h / 2 ? 'top' : 'bottom';
  const toward = away === 'top' ? 'bottom' : 'top';
  const sheet = (edge: 'top' | 'bottom', respectObstacles: boolean) => {
    const y = edge === 'top' ? (respectObstacles ? topLimit : margin) : (respectObstacles ? bottomLimit : viewport.h - margin) - pop.h;
    return { mode: 'sheet' as const, edge, x, w, y: Math.round(Math.max(margin, y)) };
  };
  const options = [sheet(away, true), sheet(toward, true), sheet(away, false), sheet(toward, false)];
  return options.find(o => !overlaps({ x: o.x, y: o.y, w, h: pop.h }, target, 6)) ?? options[0];
}

/** A step on another page navigates there first (trailing slashes ignored). */
export const needsNavigation = (pathname: string, step: TourStep) => (pathname.replace(/\/+$/, '') || '/') !== step.route;

/** Validates a stored onboarding value (from device storage or the cloud); anything else is ignored. */
export function parseOnboarding(raw: unknown): { status: OnboardingStatus; at: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { status, at } = raw as { status?: unknown; at?: unknown };
  if (status !== 'completed' && status !== 'skipped') return undefined;
  const t = typeof at === 'number' && Number.isFinite(at) ? Math.max(0, Math.round(at)) : 0;
  return { status, at: t };
}
