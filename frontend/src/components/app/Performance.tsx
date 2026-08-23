"use client";

import { MarketChart } from "@/components/charts/MarketChart";
import { CostBasisChart } from "@/components/charts/CostBasisChart";
import { Tag } from "@/components/primitives/Tag";
import type { ExecutionRecord } from "@/lib/indexer";
import type { TargetAsset, TokenMeta } from "@/hooks/useTide";

/**
 * PERFORMANCE — two charts that answer two different questions.
 *
 * Market (TradingView) answers "what is this instrument doing" — real price
 * history for the underlying equity, which TIDE has no business reproducing.
 *
 * Cost basis (TradingView Lightweight Charts, driven by our own `Executed`
 * events) answers "is my schedule working" — every fill against the running
 * weighted average. That is the number a recurring strategy lives or dies by,
 * and no market chart can show it.
 *
 * They are stacked rather than side by side even on wide screens: they share an
 * x-axis conceptually but not literally, and putting them in one row invites the
 * reader to compare points that do not line up.
 */
export function Performance({
  executions,
  quote,
  target,
  simulated,
}: {
  executions: ExecutionRecord[];
  quote: TokenMeta | undefined;
  target: TargetAsset | undefined;
  simulated: boolean;
}) {
  const forTarget = target ? executions.filter((e) => e.target === target.address) : executions;

  return (
    <section aria-label="Performance" className="border-b border-hairline">
      <div className="shell py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-eyebrow">Performance · {target?.symbol ?? "—"}</h2>
          {simulated ? <Tag tone="warn">Vault data is from a simulated market</Tag> : null}
        </div>

        <div className="space-y-px">
          <div className="bg-surface">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-4 md:px-5">
              <h3 className="text-[13px] font-medium text-hi">Market</h3>
              <p className="text-[11px] text-dim">
                The underlying equity. Independent of TIDE.
              </p>
            </div>
            <MarketChart
              symbol={target?.symbol}
              height={360}
              fallbackNote="Your vault data below is read directly from the chain and is unaffected."
            />
          </div>

          <div className="bg-surface py-4">
            <div className="flex items-baseline justify-between gap-3 px-4 pb-3 md:px-5">
              <h3 className="text-[13px] font-medium text-hi">Your cost basis</h3>
              <p className="text-[11px] text-dim">Every fill, from this vault&rsquo;s own events.</p>
            </div>
            <CostBasisChart
              executions={forTarget}
              quoteSymbol={quote?.symbol ?? ""}
              targetSymbol={target?.symbol ?? "this asset"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
