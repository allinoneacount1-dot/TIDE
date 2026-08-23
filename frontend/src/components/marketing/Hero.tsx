"use client";

import Link from "next/link";
import { useScene, SplitLines, D, E, STAGGER } from "@/components/motion";
import { CycleDiagram } from "@/components/tide/CycleDiagram";
import { Button } from "@/components/primitives/Button";
import { PROTOCOL } from "@/lib/config";
import { formatBps } from "@/lib/format";

/**
 * The hero.
 *
 * Composition is deliberately off-centre: the headline sits low-left, its
 * supporting text is offset right *and* dropped a row, and the signature
 * cycle channel runs full-bleed beneath both. Nothing is centred, there is no
 * pair of side-by-side CTAs, and there is no product screenshot — the diagram
 * is the product model, drawn.
 *
 * Every figure in the fact strip is a compiled-in protocol constant, not a
 * metric. There is no TVL counter, no user count, no "$X executed" — TIDE has
 * no basis to state those, so it states what it can prove instead.
 */
export function Hero() {
  const root = useScene<HTMLElement>(({ gsap, q, reduced }) => {
    const tl = gsap.timeline({ defaults: { ease: E.out } });

    // Beat 1 — the rule draws. Establishes the horizontal that everything else
    // hangs from, and it is the tide line doing structural work.
    tl.fromTo(
      q("[data-hero-rule]"),
      { scaleX: 0 },
      { scaleX: 1, duration: reduced ? 0 : D.slow, ease: E.inOut, transformOrigin: "left center" },
      0
    );

    // Beat 2 — eyebrow.
    tl.fromTo(
      q("[data-hero-eyebrow]"),
      { opacity: 0, y: reduced ? 0 : 8 },
      { opacity: 1, y: 0, duration: D.base },
      0.1
    );

    // Beat 3 — the headline reveals itself via SplitLines, which owns its own
    // timing. This timeline just leaves room for it.

    // Beat 4 — the offset column arrives after the headline has landed, so the
    // eye is led left-then-right rather than being asked to choose.
    tl.fromTo(
      q("[data-hero-aside] > *"),
      { opacity: 0, y: reduced ? 0 : 14 },
      { opacity: 1, y: 0, duration: D.base, stagger: STAGGER.normal },
      0.72
    );

    // Beat 5 — the channel. Draws across, then the stations resolve.
    tl.fromTo(
      q("[data-hero-channel]"),
      { opacity: 0, y: reduced ? 0 : 18 },
      { opacity: 1, y: 0, duration: D.slow },
      0.86
    );

    // The underline draws only after the last headline line has landed, so it
    // reads as a conclusion rather than as decoration arriving alongside.
    tl.fromTo(
      q("[data-hero-underline]"),
      { scaleX: 0 },
      { scaleX: 1, duration: reduced ? 0 : D.slow, ease: E.inOut },
      0.86
    );

    tl.fromTo(
      q("[data-hero-fact]"),
      { opacity: 0 },
      { opacity: 1, duration: D.base, stagger: STAGGER.tight },
      1.05
    );
  });

  return (
    <section ref={root} className="relative overflow-hidden pt-10 md:pt-16">
      <div className="shell">
        <div data-hero-rule className="h-px w-full bg-signal will-change-transform" />

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p data-hero-eyebrow className="t-eyebrow" data-tide-reveal>
            Recurring execution protocol · Robinhood Chain
          </p>
          <p data-hero-eyebrow className="t-eyebrow text-dim" data-tide-reveal>
            Non-custodial · No token · Open source
          </p>
        </div>

        <div className="mt-8 grid gap-x-8 gap-y-10 md:mt-12 md:grid-cols-12">
          <div className="md:col-span-7 lg:col-span-7">
            {/* The wordmark puts acid on roughly one twentieth of its area. The
                headline holds to that ratio: the type is white and the signal
                is the rule that draws beneath it. A headline set entirely in
                the accent is a colour field, not a signal. */}
            <SplitLines className="t-display text-[clamp(2.6rem,8.2vw,6rem)]" delay={0.22}>
              <span>Set the cadence.</span>
              <span>Capital follows.</span>
            </SplitLines>

            <div
              data-hero-underline
              className="mt-5 h-[2px] w-full max-w-[280px] origin-left bg-signal will-change-transform"
            />
          </div>

          {/* Offset: starts a column late and a row down. The asymmetry is the
              point — a symmetric hero is the thing being avoided. */}
          <div
            data-hero-aside
            className="flex flex-col justify-end gap-6 md:col-span-4 md:col-start-9 md:pb-2"
            data-tide-reveal
          >
            <p className="max-w-[42ch] text-[15px] leading-[1.6] text-mid">
              You define the interval, the size, and the highest price you will pay. The vault holds
              your capital, executes on schedule, and refuses any fill outside your guard.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/app">
                <Button variant="primary" size="lg">
                  Launch TIDE
                </Button>
              </Link>
              <Link
                href="#mechanism"
                className="group inline-flex min-h-11 items-center gap-2 px-1 text-[13px] text-low transition-colors hover:text-hi"
              >
                See how a cycle settles
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Full-bleed signature. The channel is wider than the reading column on
          purpose: it is the product's spine, not a figure inside an article. */}
      <div data-hero-channel className="mt-12 md:mt-16" data-tide-reveal>
        <div className="shell">
          <CycleDiagram />
        </div>
      </div>

      <div className="shell mt-10 md:mt-14">
        <dl className="grid grid-cols-2 gap-px border-y border-hairline bg-hairline md:grid-cols-4">
          <Fact term="Custody" detail="Your vault, your keys. TIDE cannot move your assets." />
          <Fact term="Fee ceiling" detail="Hard-capped in the contract, not by policy.">
            {formatBps(PROTOCOL.maxFeeBps)}
          </Fact>
          <Fact term="Price guard" detail="Every execution clears an on-chain floor, or it reverts." />
          <Fact term="Protocol token" detail="There isn't one. Nothing to buy, nothing to farm.">
            None
          </Fact>
        </dl>
      </div>
    </section>
  );
}

function Fact({
  term,
  children,
  detail,
}: {
  term: string;
  children?: React.ReactNode;
  detail: string;
}) {
  return (
    <div data-hero-fact className="bg-ground px-4 py-5 md:px-5">
      <dt className="t-eyebrow">{term}</dt>
      {children ? <dd className="t-num mt-1.5 text-[20px] text-hi">{children}</dd> : null}
      <dd className="mt-1.5 max-w-[30ch] text-[12.5px] leading-[1.5] text-low">{detail}</dd>
    </div>
  );
}
