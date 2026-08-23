"use client";

import { useEffect, useState } from "react";
import { StatusDot, type DotState } from "@/components/primitives/StatusDot";
import { Button } from "@/components/primitives/Button";
import { EmptyState } from "@/components/data/Ledger";
import { TideLine } from "@/components/tide/TideLine";
import type { Plan, TargetAsset, TokenMeta } from "@/hooks/useTide";
import { Readiness, readinessOf, type ReadinessTone } from "@/lib/readiness";
import { formatCadence, formatPrice, formatQuote, formatRelative, formatUnitsExact } from "@/lib/format";
import { cn } from "@/lib/cn";

const TONE_TO_DOT: Record<ReadinessTone, DotState> = {
  ready: "live",
  waiting: "armed",
  attention: "attention",
  blocked: "error",
};

/**
 * PLANS — the control surface.
 *
 * A plan is a running process, not a record, so it is presented as an operable
 * row: state on the left, the terms in the middle, the controls on the right.
 * Not a card. A card forces every plan to be the same height and pushes the
 * controls below the fold on a phone, and a portfolio of six plans becomes six
 * screens of scrolling.
 *
 * Each row carries its own tide line, live only when that specific plan's window
 * is actually open — so the signature is reporting state, not decorating.
 */
export function PlanTable({
  plans,
  readinessById,
  quote,
  targets,
  selected,
  onSelect,
  loading,
  onCreate,
  onExecute,
  onToggle,
  busyPlanId,
}: {
  plans: Plan[];
  readinessById: Map<number, { ready: boolean; reason: Readiness; referencePrice: bigint }>;
  quote: TokenMeta | undefined;
  targets: TargetAsset[];
  selected: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  onCreate: () => void;
  onExecute: (id: number) => void;
  onToggle: (id: number, next: boolean) => void;
  busyPlanId: number | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section aria-label="Plans" className="border-b border-hairline">
      <div className="shell">
        <div className="flex items-center justify-between gap-4 py-6">
          <h2 className="t-eyebrow">Plans</h2>
          <Button size="sm" variant="secondary" onClick={onCreate}>
            New plan
          </Button>
        </div>

        {loading ? (
          <div className="space-y-px pb-6">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-[92px] w-full" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            className="!px-0 pb-8"
            title="No plans yet"
            detail="A plan is the instruction the vault follows: what to buy, how often, how much, and the highest price you will accept. Nothing executes until one exists."
            action={
              <Button size="sm" variant="primary" onClick={onCreate}>
                Create your first plan
              </Button>
            }
          />
        ) : (
          <ul className="space-y-px pb-6">
            {plans.map((plan) => {
              const r = readinessById.get(plan.id);
              const copy = readinessOf(r?.reason);
              const target = targets.find((t) => t.address === plan.target);
              const isSelected = selected === plan.id;
              const dec = target?.decimals ?? plan.targetDecimals;

              return (
                <li key={plan.id}>
                  <div
                    className={cn(
                      "group relative bg-surface transition-colors",
                      isSelected ? "ring-1 ring-inset ring-signal-edge" : "hover:bg-raised"
                    )}
                  >
                    <div className="relative grid gap-x-6 gap-y-4 px-4 py-4 md:grid-cols-12 md:items-center md:px-5">
                      {/* state + asset */}
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-2.5">
                          <StatusDot state={TONE_TO_DOT[copy.tone]} />
                          <button
                            type="button"
                            onClick={() => onSelect(plan.id)}
                            aria-pressed={isSelected}
                            className="text-[15px] font-medium text-hi transition-colors hover:text-signal"
                          >
                            {target?.symbol ?? "Unknown asset"}
                          </button>
                          {!plan.active ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                              paused
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[12px] text-low">{copy.label}</p>
                        <TideLine live={Boolean(r?.ready)} className="mt-2 max-w-[120px]" />
                      </div>

                      {/* terms */}
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:col-span-5 md:grid-cols-4">
                        <Cell term="Size">
                          {quote ? `${formatQuote(plan.amountPerCycle, quote.decimals)}` : "—"}
                        </Cell>
                        <Cell term="Cadence">{formatCadence(Number(plan.interval))}</Cell>
                        <Cell term="Ceiling">
                          {plan.limitPrice > 0n ? formatPrice(plan.limitPrice) : "Oracle"}
                        </Cell>
                        <Cell term="Next">
                          {now === null
                            ? "—"
                            : r?.ready
                              ? "open"
                              : formatRelative(Number(plan.nextExecution), now)}
                        </Cell>
                      </dl>

                      {/* accumulated */}
                      <div className="md:col-span-2">
                        <p className="t-eyebrow">Acquired</p>
                        <p className="t-num mt-1 text-[15px] text-hi">
                          {formatUnitsExact(plan.totalOut, dec, 4)}
                        </p>
                        <p className="t-mono mt-0.5 text-[11px] text-dim">
                          {plan.cyclesExecuted}
                          {plan.cyclesTotal > 0 ? ` / ${plan.cyclesTotal}` : ""} cycles
                        </p>
                      </div>

                      {/* controls */}
                      <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
                        <Button
                          size="sm"
                          variant={r?.ready ? "primary" : "secondary"}
                          disabled={!r?.ready}
                          busy={busyPlanId === plan.id}
                          onClick={() => onExecute(plan.id)}
                          title={r?.ready ? "Execute this cycle now" : copy.detail}
                        >
                          Execute
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onToggle(plan.id, !plan.active)}
                          title={plan.active ? "Disarm this plan" : "Arm this plan"}
                        >
                          {plan.active ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Cell({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-eyebrow">{term}</dt>
      <dd className="t-num mt-1 truncate text-[13px] text-mid">{children}</dd>
    </div>
  );
}
