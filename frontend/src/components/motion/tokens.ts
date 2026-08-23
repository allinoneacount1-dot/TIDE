/**
 * Motion tokens.
 *
 * One vocabulary for the whole product. Durations and eases live here rather
 * than at call sites so a section reveal on the landing page and a panel change
 * in the dashboard share a rhythm instead of each inventing one.
 *
 * The scale is deliberately short. Anything over 900ms reads as waiting rather
 * than as motion, and this is a product people check between other things.
 */
export const D = {
  /** State flips: a dot turning live, a toggle. Perceptible, not animated. */
  micro: 0.14,
  /** Hovers, focus rings, small translations. */
  fast: 0.24,
  /** The workhorse: element reveals, panel swaps. */
  base: 0.42,
  /** Editorial reveals with real distance to cover. */
  slow: 0.72,
  /** Full-scene transitions. Used perhaps twice in the whole product. */
  scene: 1.1,
} as const;

export const E = {
  /** Decelerating. Almost everything entering the screen uses this. */
  out: "power3.out",
  /** Long decelerating tail for display type. */
  editorial: "expo.out",
  /** Symmetric. For things that move and come back. */
  inOut: "power2.inOut",
  /** Linear. Only for scrubbed, scroll-linked motion — easing a scrub fights
   *  the user's scroll and feels like lag. */
  scrub: "none",
} as const;

export const STAGGER = {
  /** Dense lists, table rows, ledger entries. */
  tight: 0.035,
  /** Cards, panels, sibling blocks. */
  normal: 0.07,
  /** Display lines. Wide enough to read each one land. */
  editorial: 0.11,
} as const;

/**
 * Scroll-linked scrub values. Higher numbers lag further behind the scroll,
 * which reads as weight. Above ~1.2 it reads as broken.
 */
export const SCRUB = {
  tight: 0.35,
  normal: 0.7,
  heavy: 1.1,
} as const;
