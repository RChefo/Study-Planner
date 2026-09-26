import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { toast } from '@/stores/uiStore';
import { cn } from '@/lib/cn';
import { SHEET_BELOW, TOUR_STEPS, needsNavigation, placePopover, shouldAutoStart, waitForTarget, type Placement, type Rect } from './tourModel';
import { useTourStore } from './tourStore';

const DIM = '#061813';

/** First element for a `data-tour` key that is actually on screen (desktop and phone variants share keys). */
function findVisible(key: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Opens the tour once for students who have never completed or skipped it. */
function useAutoStart() {
  const status = useAuthStore(s => s.status);
  const cloudReady = useAuthStore(s => s.cloudReady);
  const onboarding = usePlannerStore(s => s.data.preferences?.onboarding);
  const startedThisSession = useTourStore(s => s.startedThisSession);
  const start = useTourStore(s => s.start);
  useEffect(() => {
    if (!shouldAutoStart({ status, cloudReady, onboarding, startedThisSession })) return;
    // Let the first page settle so the student sees where they are before the tour begins.
    const id = setTimeout(start, 800);
    return () => clearTimeout(id);
  }, [status, cloudReady, onboarding, startedThisSession, start]);
}

/**
 * The guided tour over the real interface: the page dims, the element being explained is cut
 * out of the dimming with a soft gold ring, and a compact card explains it (a sheet on phones).
 * Steps on other pages navigate there first and wait for the element to exist.
 */
export function GuidedTour() {
  useAutoStart();
  const active = useTourStore(s => s.active);
  const index = useTourStore(s => s.index);
  const run = useTourStore(s => s.run);
  const dispatch = useTourStore(s => s.dispatch);
  const finish = useTourStore(s => s.finish);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const titleId = useId();
  const bodyId = useId();

  // The element found for a given step on a given page; anything else means "still looking".
  const stepKey = `${run}:${index}@${pathname}`;
  const [found, setFound] = useState<{ key: string; el: HTMLElement | null } | null>(null);
  const resolving = !found || found.key !== stepKey;
  const target = resolving ? null : found.el;
  const [layout, setLayout] = useState<{ hole: Rect | null; place: Placement | null }>({ hole: null, place: null });
  const popRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Remember where focus was, and give it back when the tour ends.
  useEffect(() => {
    if (!active) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    return () => returnFocus.current?.focus?.();
  }, [active]);

  // Go to the step's page, then wait for its element (never throws; missing → centred card).
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    if (needsNavigation(pathname, step)) {
      navigate(step.route);
      return;
    }
    void waitForTarget(() => (step.target ? findVisible(step.target) : null), { timeout: step.target ? 2500 : 0 }).then(el => {
      if (cancelled) return;
      if (el) {
        const r = el.getBoundingClientRect();
        const fixed = getComputedStyle(el).position === 'fixed';
        const behavior = reducedMotion() ? 'auto' : 'smooth';
        const phone = window.innerWidth < SHEET_BELOW;
        if (!fixed && phone && r.height > window.innerHeight * 0.35) {
          // Tall element on a phone: bring its top just under the header, leaving room for the sheet below.
          window.scrollBy({ top: r.top - 68, behavior });
        } else if (!fixed && (r.top < 72 || r.bottom > window.innerHeight - 110)) {
          el.scrollIntoView({ block: 'center', behavior });
        }
      }
      setFound({ key: stepKey, el });
    });
    return () => {
      cancelled = true;
    };
  }, [active, stepKey, pathname, step, navigate]);

  // Follow the real element every frame (page transitions, smooth scroll, resize, fonts).
  useLayoutEffect(() => {
    if (!active || resolving) return;
    let frame = 0;
    const tick = () => {
      const viewport = { w: window.innerWidth, h: window.innerHeight };
      let hole: Rect | null = null;
      if (target?.isConnected) {
        const r = rectOf(target);
        const pad = 8;
        const x = Math.max(4, r.x - pad);
        const y = Math.max(4, r.y - pad);
        hole = { x, y, w: Math.min(viewport.w - 4, r.x + r.w + pad) - x, h: Math.min(viewport.h - 4, r.y + r.h + pad) - y };
      }
      const pop = popRef.current ? { w: popRef.current.offsetWidth, h: popRef.current.offsetHeight } : { w: 340, h: 220 };
      const obstacles = [...document.querySelectorAll<HTMLElement>('[data-tour-avoid]')]
        .filter(el => target && el !== target && !el.contains(target) && !target.contains(el))
        .map(rectOf)
        .filter(r => r.w > 0 && r.h > 0);
      const place = placePopover({ target: hole, pop, viewport, obstacles, rtl: document.documentElement.dir === 'rtl' });
      setLayout(prev => (JSON.stringify(prev) === JSON.stringify({ hole, place }) ? prev : { hole, place }));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [active, resolving, target]);

  // Each new step: move focus to its main action (screen readers also hear the live region).
  useEffect(() => {
    if (active && !resolving) primaryRef.current?.focus({ preventScroll: true });
  }, [active, resolving, index]);

  // Escape skips from anywhere while the tour is open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      skip();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });

  if (!active) return null;

  function skip() {
    finish('skipped');
    toast('يمكنك إعادة الجولة في أي وقت من زر الدليل «؟» في الأعلى.', 'info');
  }
  const complete = () => {
    finish('completed');
    toast('أنت جاهز. بالتوفيق في رحلتك!', 'success');
  };
  const next = () => (last ? complete() : dispatch({ type: 'next' }));
  const prev = () => dispatch({ type: 'prev' });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      e.preventDefault();
      next();
    } else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && index > 0) {
      e.preventDefault();
      prev();
    } else if (e.key === 'Tab') {
      // Keep focus inside the tour card.
      const items = [...(popRef.current?.querySelectorAll<HTMLElement>('button') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const to = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
      e.preventDefault();
      items[to]?.focus();
    }
  };

  const { hole, place } = layout;
  const ready = !resolving && !!place;
  const sheet = place?.mode === 'sheet';
  const popStyle = place ? { left: place.x, top: place.y, width: place.mode === 'sheet' ? place.w : undefined } : { left: -9999, top: 0 };
  const moving = 'transition-[left,top,width,height,opacity] duration-300 ease-out motion-reduce:transition-none';

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* Dimming with the target cut out; it also swallows background clicks so the tour can't break. */}
      <svg className="absolute inset-0 size-full" aria-hidden="true" onMouseDown={e => e.preventDefault()}>
        <defs>
          <mask id="tour-cutout">
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="18" fill="black" className={moving} />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={DIM} fillOpacity="0.58" mask="url(#tour-cutout)" />
      </svg>
      {hole && (
        <div
          aria-hidden="true"
          className={cn('pointer-events-none absolute rounded-[18px] ring-2 ring-[#e0a94f] shadow-[0_0_0_6px_#f2c77e2e,0_0_32px_#e9b87255]', moving)}
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
        />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
        className={cn(
          'absolute max-w-[calc(100vw-24px)] bg-paper text-ink shadow-[0_24px_60px_-20px_#000000aa] ring-1 ring-brand-night/10',
          sheet ? 'rounded-3xl p-5' : 'w-[340px] rounded-2xl p-5',
          ready ? 'opacity-100' : 'pointer-events-none opacity-0',
          moving,
        )}
        style={popStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* the tour's own little path */}
            <span aria-hidden="true" className="flex items-center gap-1">
              {TOUR_STEPS.map((s, i) => (
                <span key={s.id} className={cn('rounded-full transition-all duration-300 motion-reduce:transition-none', i === index ? 'h-1.5 w-4 bg-[#c19a4f]' : i < index ? 'size-1.5 bg-[#c19a4f]/60' : 'size-1.5 bg-[#c9d3cc]')} />
              ))}
            </span>
            <span className="text-xs tabular-nums text-muted">
              {index + 1} من {TOUR_STEPS.length}
            </span>
          </div>
          <button type="button" onClick={skip} className="rounded-full px-2 py-1 text-xs text-subtle transition-colors hover:bg-ink/5 hover:text-ink">
            تخطّي الجولة
          </button>
        </div>

        <h2 id={titleId} className="font-display m-0 mt-3 text-[1.6rem] font-normal leading-snug text-brand-night">
          {step.title}
        </h2>
        <p id={bodyId} className="m-0 mt-1.5 text-[15px] leading-relaxed text-subtle">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          {index > 0 && (
            <button type="button" onClick={prev} className="h-10 rounded-full px-4 text-sm font-medium text-subtle transition-colors hover:bg-ink/5 hover:text-ink">
              السابق
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={next}
            className="h-10 rounded-full bg-brand-night px-5 text-sm font-semibold text-dawn transition-colors hover:bg-brand-deep focus-visible:outline-[#c19a4f]"
          >
            {last ? 'ابدأ رحلتك' : 'التالي'}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {ready ? `الخطوة ${index + 1} من ${TOUR_STEPS.length}: ${step.title}` : ''}
      </p>
    </div>,
    document.body,
  );
}
