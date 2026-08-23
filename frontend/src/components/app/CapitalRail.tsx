"use client";

import { Figure, FigureRail } from "@/components/data/Figure";
import { Button } from "@/components/primitives/Button";
import type { Plan, TokenMeta } from "@/hooks/useTide";
import { formatQuote } from "@/lib/format";

/**
 * CAPITAL — where the money is, in one line.
 *
 * Idle versus committed is the distinction that matters for a recurring
 * strategy: idle capital is what will fund upcoming cycles, committed is what
 * each round of cycles will consume. A single "balance" number hides whether
 * the next window will actually fire.
 *
 * "Runway" is derived, not stored: how many more cycles the current idle balance
 * can fund across all armed plans. It is the number that answers "when do I need
 * to top up", which is the only capital question a DCA user actually has.
 */
export function CapitalRail({
  idle,
  plans,
  quote,
  loading,
  onDeposit,
  onWithdraw,
}: {
  idle: bigint | undefined;
  plans: Plan[];
  quote: TokenMeta | undefined;
  loading: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const armed = plans.filter((p) => p.active);
  const perRound = armed.reduce((sum, p) => sum + p.amountPerCycle, 0n);
  const lifetimeIn = plans.reduce((sum, p) => sum + p.totalIn, 0n);
  const cycles = plans.reduce((sum, p) => sum + p.cyclesExecuted, 0);

  const runway = perRound > 0n && idle !== undefined ? Number(idle / perRound) : null;

  return (
    <section aria-label="Capital" className="border-b border-hairline">
      <div className="shell">
        <div className="flex items-center justify-between gap-4 pt-6">
          <h2 className="t-eyebrow">Capital</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={onDeposit}>
              Deposit
            </Button>
            <Button size="sm" variant="secondary" onClick={onWithdraw}>
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      <div className="shell pb-6 pt-4">
        <FigureRail className="grid-cols-2 lg:grid-cols-4 [&>*]:!px-0 lg:[&>*:not(:first-child)]:!pl-6">
          <Figure
            label="Idle"
            value={quote && idle !== undefined ? formatQuote(idle, quote.decimals) : "—"}
            note={quote ? `${quote.symbol} · not yet deployed` : undefined}
            size="lg"
            loading={loading}
          />
          <Figure
            label="Per round"
            value={quote ? formatQuote(perRound, quote.decimals) : "—"}
            note={`${armed.length} armed ${armed.length === 1 ? "plan" : "plans"}`}
            loading={loading}
          />
          <Figure
            label="Runway"
            value={runway === null ? "—" : runway === 0 ? "0 rounds" : `${runway} rounds`}
            note={
              runway === null
                ? "No armed plan"
                : runway === 0
                  ? "Next window will not fire"
                  : "At the current idle balance"
            }
            tone={runway === 0 ? "warn" : "default"}
            loading={loading}
          />
          <Figure
            label="Deployed to date"
            value={quote ? formatQuote(lifetimeIn, quote.decimals) : "—"}
            note={`Across ${cycles} settled ${cycles === 1 ? "cycle" : "cycles"}`}
            loading={loading}
          />
        </FigureRail>
      </div>
    </section>
  );
}
