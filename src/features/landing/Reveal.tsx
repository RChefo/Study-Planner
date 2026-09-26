import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { reducedMotion } from './useSceneMotion';

/** Fades its content up once it scrolls into view (plain, visible content when motion is reduced). */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={cn('reveal', className)} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}
