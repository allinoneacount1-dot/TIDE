"use client";

import { useState } from "react";
import { MarketChart } from "@/components/charts/MarketChart";
import { Segmented } from "@/components/primitives/Segmented";
import { useScene, D, E } from "@/components/motion";

/**
 * The market TIDE buys into.
 *
 * Real price history for the underlying equities, from TradingView. It earns a
 * place on this page because it is the one thing here that is not TIDE's own
 * claim about itself: an outside record of the instruments a plan accumulates.
 *
 * It is explicitly framed as independent. TIDE does not produce this data,
 * does not influence it, and shows it so the schedule you set has a context —
 * not as a performance figure of its own.
 */

const ASSETS = [
  { value: "AAPL", label: "AAPL" },
  { value: "NVDA", label: "NVDA" },
  { value: "SPY", label: "SPY" },
  { value: "QQQ", label: "QQQ" },
] as const;

export function Market() {
  const [symbol, setSymbol] = useState<(typeof ASSETS)[number]["value"]>("AAPL");

  const root = useScene<HTMLElement>(({ gsap, q, reduced }) => {
    gsap.fromTo(
      q("[data-market-reveal]"),
      { opacity: 0, y: reduced ? 0 : 16 },
      {
        opacity: 1,
        y: 0,
        duration: D.base,
        ease: E.out,
        stagger: 0.08,
        scrollTrigger: { trigger: q("[data-market-reveal]")[0], start: "top 84%", once: true },
      }
    );
  });

  return (
    <section ref={root} id="market" className="scroll-mt-16 border-t border-hairline py-16 md:py-24">
      <div className="shell">
        <div
          data-market-reveal
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          data-tide-reveal
        >
          <div className="max-w-[46ch]">
            <p className="t-eyebrow">The market</p>
            <h2 className="t-display mt-3 text-[clamp(1.75rem,4vw,3rem)]">
              What a schedule accumulates.
            </h2>
            <p className="mt-4 text-[14px] leading-[1.65] text-mid">
              Tokenized equities on Robinhood Chain track the underlying instrument. This is that
              instrument&rsquo;s real price history — TradingView&rsquo;s record, not ours.
            </p>
          </div>

          <Segmented
            label="Asset"
            value={symbol}
            onChange={setSymbol}
            options={ASSETS}
            className="shrink-0"
          />
        </div>

        <div data-market-reveal className="mt-8 bg-surface" data-tide-reveal>
          <MarketChart symbol={symbol} height={420} />
        </div>

        <p data-market-reveal className="mt-4 max-w-[70ch] text-[12.5px] leading-[1.6] text-low" data-tide-reveal>
          TIDE does not predict this line and makes no claim about it. What TIDE controls is the
          cadence you buy on and the highest price you will accept — and it proves both on chain,
          every cycle.
        </p>
      </div>
    </section>
  );
}
