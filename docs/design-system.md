# Design system

## Origin

The palette is not chosen alongside the wordmark, it is sampled from it.

| | | |
|---|---|---|
| Ground | `#080808` | The logo's field |
| Mark | `#F6F6F6` | The letterforms |
| Signal | `#D4FD0B` | The accent bar and the degree mark |

The wordmark itself is vector-traced from the source artwork at 100% pixel
agreement, split into two groups: letterforms take `currentColor` so the mark
inherits its context, and the accent is pinned to the signal token so the acid
stays exactly the acid everywhere.

`Mark.tsx` is a crop of the same geometry — the reversed **Ǝ** with its bar and
dot — used where the full wordmark would be illegible. It is a crop, not a
redraw, so the two cannot drift.

## Neutrals are warm

The signal is a yellow-green. The cool blue-greys of a typical dark product UI
vibrate against it — which is what the previous build's `#8a8f98`, imported from
a different product's palette, was doing. Neutrals here are warm-shifted
(`#a9aaa6`, `#6f706c`, `#4b4c49`) so they sit underneath the signal quietly.

## Signal discipline

The wordmark puts acid on roughly one twentieth of its area. The interface holds
to that ratio. Acid means exactly one of:

- a live or ready state
- the single most important action on a screen
- the tide line, when what it annotates is genuinely live

It is never a headline fill, never a section background, never a border for
emphasis. The hero headline is white with an acid rule beneath it for this
reason — a headline set entirely in the accent is a colour field, not a signal.

Three state hues total: acid (ready), amber (attention), red (failure). A fourth
starts competing and the reader loses the ability to tell what is urgent.

---

## Type

| | |
|---|---|
| Display + UI | **Archivo** variable, width axis 62–125 |
| Numerals, hashes, addresses | **JetBrains Mono** variable |

Archivo carries a width axis, which is what lets display type sit at the
wordmark's proportion without a second display family — matching a wide
geometric with tracking alone always reads as a compromise.

Both are **vendored** as latin-subset woff2 (90KB + 40KB) and loaded through
`next/font/local`. Google Fonts is a build-time network dependency: when it is
slow or blocked, the *build* fails. The previous build pulled three families over
`@import url(fonts.googleapis.com)` inside CSS, blocking first paint on a
third-party round trip.

Every figure is tabular. In a financial interface, digits that do not line up by
place value are a defect.

---

## Shape

**The chamfer.** The wordmark's letterforms are cut at 45°. One corner clipped,
never four — four reads as sci-fi costume, one reads as a machined part. Applied
to panels, buttons and status chips via `clip-path`.

A clipped element cannot carry a CSS border, so `.chamfer-edge` draws the outline
as a polygon that follows the same path.

---

## The tide line

TIDE's signature: a hairline carrying a travelling highlight. It appears under
the active nav item, along the execution spine, across section seams, beneath a
live figure, and on each plan row.

It is never decorative. `live` is only true when the thing it annotates is
actually live — an armed plan whose window is open, a fresh oracle, a pending
transaction. A page of rules is not a page of animation.

---

## Component grammar

The rule: the component follows the kind of information, not a default.

| Information | Component |
|---|---|
| Records with a schema | `Ledger` — a real `<table>`, scoped headers, right-aligned numerics |
| A number | `Figure` — label, value, note on a baseline grid. Not a card |
| Related numbers | `FigureRail` — figures on a shared rule |
| Warnings, notices | `SignalRail` — a coloured edge, not a box |
| A running process | The plan row: state left, terms centre, controls right |
| A process over time | The cycle diagram |
| A surface | `Panel` |

**Not everything is a card.** A card grid is the clearest tell of a generated
dashboard: it forces every item to the same height, triples the ink for no added
meaning, and pushes controls below the fold on a phone.

Tables scroll inside their own container on narrow screens rather than
collapsing into stacked cards — someone comparing execution prices needs the
column, and horizontal scroll preserves it.

---

## Motion

GSAP, as architecture rather than decoration. Tokens live in
`components/motion/tokens.ts` so a landing-page reveal and a dashboard panel
change share a rhythm.

| | |
|---|---|
| `micro` 140ms | State flips. Perceptible, not animated |
| `fast` 240ms | Hover, focus, small translations |
| `base` 420ms | The workhorse |
| `slow` 720ms | Editorial reveals with distance to cover |
| `scene` 1.1s | Full-scene transitions. Used about twice |

**Every scene is scoped and reverted.** `useScene` wraps `gsap.context`, so every
tween, ScrollTrigger and listener is torn down on unmount. The previous build
registered ScrollTrigger inside each page component, leaving dead triggers
pinning scroll positions across route changes.

**Choreography, not blanket fades.** The hero runs one timeline with beats: the
rule draws, the eyebrow arrives, the headline lines mask-reveal, the offset
column follows *after* the headline has landed, then the channel, then the facts.
The eye is led left-then-right rather than asked to choose.

**Scroll operates the product, it does not illustrate it.** The mechanism section
pins and scrubs the *same* cycle diagram from the hero. It is not a second set of
graphics explaining the first.

**Responsive motion variants.** Below `md` the mechanism does not pin at all.
Pinning a tall section on a phone fights the browser's own scroll and URL-bar
collapse, and produces exactly the heavy scroll it was meant to avoid. Mobile
gets the same acts, stacked, revealing normally.

### Reduced motion

Not a blanket kill. Position and opacity settle instantly; state changes that
carry meaning keep a short cross-fade, because a user who asked for less motion
still needs to see that a number changed. `MotionProvider` subscribes to the
media query rather than reading it once at mount.

---

## Accessibility

Enforced by `tests/e2e/responsive.spec.ts`, not asserted here.

- Focus rings use the signal colour and are never removed
- Every interactive target meets WCAG 2.2 AA's 24px minimum at phone width
- Status is carried by colour, motion **and** an adjacent label — never colour alone
- Icons are labelled or explicitly `aria-hidden`
- One `h1` per page, no skipped heading levels
- Drawers use native `<dialog>`, so focus trapping and Escape come from the platform
- The segmented control uses real radio semantics, so arrow keys work
- A skip link precedes the header rail

---

## What is deliberately absent

From the brief's exclusion list, and worth naming so they do not creep back:

purple/blue gradients · neon · glowing orbs · floating cubes · fake 3D
blockchain · glassmorphism · uniform rounded cards · repetitive bento grids ·
particles · parallax without purpose · giant generic SaaS headlines · stock or
AI-generated illustration · fake terminal output · decorative charts ·
meaningless statistics

Also removed from the previous build specifically: the grain overlay, the
extruded `text-shadow` 3D wordmark treatment, the acid mesh-gradient hero
background, the `backdrop-filter` card blur, and the decorative row of state
pills rendered as if they were UI.
