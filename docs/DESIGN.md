# TIDE — DESIGN.md (Machine Editorial — Linear DNA)

## Design System
- **Surface:** Monitor (primary) + Operate (secondary). No marketing hero.
- **Canvas:** #08090a marketing, #0f1011 panel, #191a1b elevated, #23252a hover. Borders rgba(255,255,255,0.05-0.08). Text #f7f8f8 / #d0d6e0 / #8a8f98 / #62666d.
- **Accent:** #CCFF00 acid ONLY for signal (dot, active state, CTA). <8% surface.
- **Type:** Inter Variable cv01+ss03, weights 400/510/590. Display -1.056px tracking at 48px. Mono JetBrains Mono 400/500 for amounts/hashes. Serif Instrument Serif for display only.
- **Spacing:** 8px base, 16/24/32 rhythm. Grid 12-col Swiss, gutter 16 mobile / 24 desktop, max 1440.
- **Radius:** 6px buttons/inputs, 8px cards, 9999 pill, 50% dot.
- **Elevation:** luminance stacking (0.02 → 0.04 → 0.05), never solid on dark. Inset for recessed.
- **Motion:** 150ms ease-out micro, 300ms page. Respect prefers-reduced-motion.

## Slop Diagnostic (10 tells): 2/10
- Tech gradient: NO (graphite only)
- Generic hue: NO (acid chosen for Robinhood)
- Feature-tile grid: NO (removed hero+3 cards)
- Accent rail: NO
- Unearned blur: NO (blur 12px with border system)
- Monument stat: NO (stats mono 14px, not 72px)
- Icon topper: NO
- Center stack: NO (Monitor layout, not centered)
- Default type: NO (Inter cv01/ss03 deliberate + Instrument Serif)
- Wrong surface: NO (Monitor correctly)

Repair: n/a — compositional tells (3,8,10) already fixed via Monitor surface.

## Variants
- Comfortable vs Compact density toggle (Linear inspiration)
- Tweaks panel hidden by default (theme/density/accent/mono)
