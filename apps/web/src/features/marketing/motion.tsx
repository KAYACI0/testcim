'use client';

import { useEffect, useRef, useState } from 'react';

import type { CSSProperties, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** True once the element has entered the viewport; with `once: false` it tracks visibility. */
export function useInView<T extends Element>(
  options?: IntersectionObserverInit & { once?: boolean },
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;
  const rootMargin = options?.rootMargin ?? '0px 0px -12% 0px';
  const threshold = options?.threshold ?? 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView] as const;
}

/**
 * Fades its children up when they scroll into view (marketing only). The `reveal`
 * styles and their reduced-motion and no-script fallbacks live in styles/marketing.css.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly as?: ElementType;
  readonly className?: string;
}) {
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={cn('reveal', className)}
      data-shown={inView ? '' : undefined}
      style={{ '--reveal-delay': `${String(delay)}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
