"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useMotion } from "./MotionProvider";

/**
 * Interpolates a number when it changes, instead of snapping.
 *
 * Used for balances and prices. The point is not decoration: a figure that
 * counts from its old value to its new one tells you *that it moved and in which
 * direction* without a separate indicator. A figure that snaps looks identical
 * whether it changed by a cent or by half the position.
 *
 * Under reduced motion the value is set immediately — but the caller still gets
 * the change, so the surrounding flash-of-change styling still fires.
 */
export function Ticker({
  value,
  format,
  className = "",
  duration = 0.6,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const el = useRef<HTMLSpanElement>(null);
  const current = useRef(value);
  const { reduced } = useMotion();

  useEffect(() => {
    const node = el.current;
    if (!node) return;

    if (reduced || current.current === value) {
      node.textContent = format(value);
      current.current = value;
      return;
    }

    const proxy = { n: current.current };
    const tween = gsap.to(proxy, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        node.textContent = format(proxy.n);
      },
      onComplete: () => {
        current.current = value;
        node.textContent = format(value);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, format, duration, reduced]);

  // Rendered with the current value so SSR and the first paint are correct.
  return (
    <span ref={el} className={className}>
      {format(value)}
    </span>
  );
}
