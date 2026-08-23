"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useMotion } from "./MotionProvider";

type SceneBuilder = (ctx: {
  gsap: typeof gsap;
  root: HTMLElement;
  /** Scoped selector — never leaks outside this scene's root. */
  q: (selector: string) => HTMLElement[];
  reduced: boolean;
}) => void;

/**
 * Runs one GSAP scene scoped to a root element, and reverts it cleanly.
 *
 * `gsap.context` handles the cleanup that the previous build got wrong: every
 * tween, ScrollTrigger and event listener created inside the builder is torn
 * down on unmount, so route changes do not leave dead triggers pinning scroll
 * positions.
 *
 * When reduced motion is on, the builder still runs — it receives `reduced:
 * true` and is expected to express the same *state changes* without the
 * *movement*. That is deliberately not a blanket early return: a user who has
 * asked for less motion still needs to see that a number changed.
 */
export function useScene<T extends HTMLElement = HTMLDivElement>(
  build: SceneBuilder,
  deps: unknown[] = []
): RefObject<T | null> {
  const root = useRef<T | null>(null);
  const { ready, reduced } = useMotion();

  useLayoutEffect(() => {
    if (!ready || !root.current) return;
    const el = root.current;

    const ctx = gsap.context((self) => {
      build({
        gsap,
        root: el,
        q: (selector: string) => (self.selector?.(selector) ?? []) as HTMLElement[],
        reduced,
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reduced, ...deps]);

  return root;
}
