"use client";

import { Children, type ReactNode } from "react";
import { useScene } from "./useScene";
import { D, E, STAGGER } from "./tokens";

/**
 * Masked line reveal for display type.
 *
 * Each child becomes one line inside an overflow-hidden mask and rises into
 * place. This is the one piece of decorative motion TIDE keeps, because it is
 * doing real work: it establishes reading order for a headline that is
 * deliberately laid out asymmetrically, so the eye is told where to start.
 *
 * Lines are authored as explicit children rather than split from a string, so
 * the break points are a typographic decision and never depend on the viewport
 * happening to wrap where the designer hoped.
 */
export function SplitLines({
  children,
  className = "",
  delay = 0,
  trigger,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Reveal on scroll instead of on mount. */
  trigger?: boolean;
}) {
  const ref = useScene<HTMLDivElement>(({ gsap, q, root, reduced }) => {
    const lines = q("[data-line-inner]");
    if (!lines.length) return;

    if (reduced) {
      gsap.set(lines, { yPercent: 0, opacity: 1 });
      return;
    }

    gsap.fromTo(
      lines,
      { yPercent: 108, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: D.slow,
        ease: E.editorial,
        stagger: STAGGER.editorial,
        delay,
        ...(trigger
          ? { scrollTrigger: { trigger: root, start: "top 82%", once: true } }
          : {}),
      }
    );
  }, [delay, trigger]);

  return (
    <div ref={ref} className={className} data-tide-reveal>
      {Children.map(children, (child, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <span data-line-inner className="block will-change-transform">
            {child}
          </span>
        </span>
      ))}
    </div>
  );
}
