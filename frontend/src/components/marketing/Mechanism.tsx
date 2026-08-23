"use client";

import { useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScene, D, E } from "@/components/motion";
import { CycleDiagram, STATIONS, type StationId } from "@/components/tide/CycleDiagram";
import { cn } from "@/lib/cn";

/**
 * The mechanism, told as a scroll.
 *
 * The section pins and the reader scrubs through six acts. Each act advances
 * the *same* cycle diagram from the hero — so the scroll is not illustrating
 * the product with a second set of graphics, it is operating the product's own
 * model. That is the difference between scroll-as-storytelling and
 * scroll-as-slideshow.
 *
 * Below `md` it does not pin. Pinning a tall section on a phone fights the
 * browser's own scroll and URL-bar collapse, and produces exactly the "heavy
 * scroll" this was supposed to avoid. Mobile gets the acts stacked, each
 * revealing normally, with one compact diagram at the top. Same content, same
 * order, no pin.
 */

const ACTS: { station: StationId; index: string; headline: string; body: string }[] = [
  {
    station: "capital",
    index: "01",
    headline: "Capital that waits is capital that drifts.",
    body: "Deposit once. The balance sits in a vault only you can withdraw from — not a shared pool, not a contract TIDE can sweep, not an address anyone else controls.",
  },
  {
    station: "cadence",
    index: "02",
    headline: "A schedule is a decision made in advance.",
    body: "Interval, size, and the highest price you will accept. Written to the contract, editable by you alone, and enforced whether or not you are watching.",
  },
  {
    station: "window",
    index: "03",
    headline: "The window opens on time, or it tells you why not.",
    body: "When the interval elapses the vault reports itself executable. When it is not, it returns the reason — underfunded, paused, market closed, no price guard. Never a blank screen and a shrug.",
  },
  {
    station: "route",
    index: "04",
    headline: "One cycle. One allowance. Revoked in the same call.",
    body: "The keeper routes a single cycle of capital to an allowlisted venue. The approval covers that exact amount and is set back to zero before the transaction returns.",
  },
  {
    station: "settle",
    index: "05",
    headline: "What arrived is measured, not reported.",
    body: "Output is the vault's own balance delta, checked against a floor derived from your limit price and the Chainlink reference. A short fill reverts the whole transaction and your capital stays where it was.",
  },
  {
    station: "advance",
    index: "06",
    headline: "The grid holds.",
    body: "The next window is set from the scheduled one, not from now, so cadence never drifts. And after an outage there is no burst of catch-up buys at whatever price the market happens to be.",
  },
];

export function Mechanism() {
  const [active, setActive] = useState(0);

  const root = useScene<HTMLElement>(({ gsap, root: el, q, reduced }) => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const acts = q("[data-act]");

    if (!isDesktop || reduced) {
      // Stacked variant: each act reveals as it enters. No pin, no scrub.
      acts.forEach((act) => {
        gsap.fromTo(
          act,
          { opacity: 0, y: reduced ? 0 : 20 },
          {
            opacity: 1,
            y: 0,
            duration: D.base,
            ease: E.out,
            scrollTrigger: { trigger: act, start: "top 86%", once: true },
          }
        );
      });
      return;
    }

    // Desktop: one pin, scrubbed. `snap` lands the reader on an act rather than
    // between two of them, which is what makes it read as chapters instead of
    // as a smear.
    const stage = q("[data-stage]")[0];
    if (!stage) return;

    ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: () => `+=${ACTS.length * 62}%`,
      pin: stage,
      pinSpacing: true,
      scrub: 0.5,
      snap: {
        snapTo: (v) => Math.round(v * (ACTS.length - 1)) / (ACTS.length - 1),
        duration: { min: 0.15, max: 0.4 },
        ease: E.inOut,
      },
      onUpdate: (self) => {
        const i = Math.min(ACTS.length - 1, Math.round(self.progress * (ACTS.length - 1)));
        setActive(i);
      },
    });

    // Acts cross-fade in place rather than sliding, so the pinned diagram stays
    // the only thing moving. Two moving elements would compete.
    acts.forEach((act, i) => {
      gsap.set(act, { opacity: i === 0 ? 1 : 0 });
    });
  });

  return (
    <section ref={root} id="mechanism" className="relative scroll-mt-16">
      <div data-stage className="shell py-16 md:flex md:min-h-dvh md:flex-col md:justify-center md:py-0">
        <header className="max-w-[52ch]">
          <p className="t-eyebrow">The mechanism</p>
          <h2 className="t-display mt-3 text-[clamp(1.75rem,4vw,3rem)]">
            Six stages. Every one of them verifiable.
          </h2>
        </header>

        {/* Desktop: the pinned diagram, driven by scroll position. */}
        <div className="mt-8 hidden md:mt-10 md:block">
          <CycleDiagram activeStation={STATIONS[active]!.id} autoplay={false} compact />
        </div>

        {/* Mobile: one compact instance at the top, not pinned. */}
        <div className="mt-8 md:hidden">
          <CycleDiagram compact />
        </div>

        <div className="relative mt-8 md:mt-10 md:min-h-[12rem]">
          {ACTS.map((act, i) => (
            <article
              key={act.station}
              data-act
              className={cn(
                "grid gap-x-8 gap-y-3 md:grid-cols-12",
                // Desktop stacks all acts in the same box and cross-fades.
                "md:absolute md:inset-x-0 md:top-0",
                i > 0 && "mt-12 md:mt-0"
              )}
              style={{ opacity: i === active ? 1 : undefined }}
              aria-hidden={i !== active ? undefined : undefined}
            >
              <div className="md:col-span-1">
                <span className="t-mono text-[13px] text-signal">{act.index}</span>
              </div>
              <h3 className="t-display text-[clamp(1.35rem,2.6vw,2rem)] md:col-span-6">
                {act.headline}
              </h3>
              <p className="max-w-[48ch] text-[14px] leading-[1.65] text-mid md:col-span-5">
                {act.body}
              </p>
            </article>
          ))}
        </div>

        {/* Desktop act index. Doubles as the scroll affordance. */}
        <ol className="mt-8 hidden gap-px md:flex" aria-label="Stages">
          {ACTS.map((act, i) => (
            <li key={act.station} className="flex-1">
              <div className={cn("h-[2px] transition-colors duration-300", i <= active ? "bg-signal" : "bg-rule")} />
              <span
                className={cn(
                  "mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  i === active ? "text-signal" : "text-dim"
                )}
              >
                {STATIONS[i]!.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
