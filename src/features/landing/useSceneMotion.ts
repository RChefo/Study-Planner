import { useEffect, type RefObject } from 'react';

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Drives the hero parallax: writes --px / --py (pointer, -1…1, eased) and --sy (scroll px)
 * onto the given element. Does nothing when the visitor prefers reduced motion; pointer
 * parallax only runs for fine pointers (not touch).
 */
export function useSceneMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let visible = true;

    const tick = () => {
      frame = 0;
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      el.style.setProperty('--px', current.x.toFixed(4));
      el.style.setProperty('--py', current.y.toFixed(4));
      el.style.setProperty('--sy', String(Math.min(window.scrollY, 1200)));
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) schedule();
    };
    const schedule = () => {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    observer.observe(el);
    if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
