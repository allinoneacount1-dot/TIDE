"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusDot, type DotState } from "@/components/primitives/StatusDot";
import { TideLine } from "@/components/tide/TideLine";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { Skeleton } from "@/components/primitives/Skeleton";
import type { Plan, TargetAsset, TokenMeta } from "@/hooks/useTide";
import { readinessOf, Readiness, type ReadinessTone } from "@/lib/readiness";
import { formatCadence, formatQuote, formatRelative } from "@/lib/format";

const TONE_TO_DOT: Record<ReadinessTone, DotState> = {
  ready: "live",
  waiting: "armed",
  attention: "attention",
  blocked: "error",
};

/**
 * NOW and NEXT, the two questions a recurring-execution product must answer in
 * the first second: what is the system doing, and what happens next.
 *
 * The countdown ticks locally off a server-anchored timestamp rather than
 * re-reading the chain every second. The previous build rendered
 * `new Date().toLocaleTimeString()` directly in JSX, which produces a different
 * string on the server and the client and throws a hydration mismatch on every
 * load; the clock here only starts after mount.
 */
export function NowNext({
  plans,
  readinessById,
  quote,
  targets,
  loading,
  onAct,
}: {
  plans: Plan[];
  readinessById: Map<number, { ready: boolean; reason: Readiness; referencePrice: bigint }>;
  quote: TokenMeta | undefined;
  targets: TargetAsset[];
  loading: boolean;
  onAct: (action: "deposit" | "plan" | "unpause" | "resume", planId?: number) => void;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(t);
  }, []);

  const active = plans.filter((p) => p.active);
  const imminent = active
    .slice()
    .sort((a, b) => Number(a.nextExecution - b.nextExecution))
    .at(0);

  const imminentReadiness = imminent ? readinessById.get(imminent.id) : undefined;
  // Past its window but not executable — the reason is in `copy.detail`.
  const overdue =
    imminent !== undefined &&
    now !== null &&
    Number(imminent.nextExecution) <= now &&
    !imminentReadiness?.ready;
  const copy = readinessOf(imminentReadiness?.reason);
  const target = imminent ? targets.find((t) => t.address === imminent.target) : undefined;

  /**
   * Grouped by reason, not listed per plan.
   *
   * Three plans blocked on the same empty balance is one problem with one fix.
   * Rendering it three times turns a clear instruction into a wall the user
   * scrolls past.
   */
  const attention = useMemo(() => {
    const groups = new Map<Readiness, { reason: Readiness; symbols: string[]; planIds: number[] }>();
    for (const p of plans) {
      const r = readinessById.get(p.id);
      if (!r || readinessOf(r.reason).tone !== "attention") continue;
      const symbol = targets.find((t) => t.address === p.target)?.symbol ?? `Plan ${p.id}`;
      const g = groups.get(r.reason) ?? { reason: r.reason, symbols: [], planIds: [] };
      if (!g.symbols.includes(symbol)) g.symbols.push(symbol);
      g.planIds.push(p.id);
      groups.set(r.reason, g);
    }
    return [...groups.values()];
  }, [plans, readinessById, targets]);

  const anyReady = plans.some((p) => readinessById.get(p.id)?.ready);

  return (
    <section aria-label="Current status" className="border-b border-hairline">
      <div className="shell grid items-start gap-px bg-hairline lg:grid-cols-12">
        {/* NOW / NEXT */}
        <div className="bg-ground px-0 py-6 lg:col-span-8 lg:pr-8">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-72" />
              <Skeleton className="h-3 w-48" />
            </div>
          ) : !imminent ? (
            <div className="space-y-3">
              <p className="t-eyebrow">Now</p>
              <p className="t-display text-[clamp(1.4rem,3vw,2.1rem)] text-mid">No plan is running.</p>
              <p className="max-w-[52ch] text-[13.5px] leading-[1.6] text-low">
                A vault holds capital but does nothing on its own. Create a plan to give it a
                cadence, a size, and a price you are willing to pay.
              </p>
              <Button variant="primary" size="sm" onClick={() => onAct("plan")}>
                Create a plan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <StatusDot state={TONE_TO_DOT[copy.tone]} />
                <p className="t-eyebrow text-mid">{copy.label}</p>
                <span className="text-[11px] text-dim">
                  {active.length} of {plans.length} {plans.length === 1 ? "plan" : "plans"} armed
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p className="t-num text-[clamp(2.2rem,6vw,3.6rem)] leading-none text-hi">
                  {now === null ? (
                    <span className="text-dim">—</span>
                  ) : imminentReadiness?.ready ? (
                    <span className="text-signal">Window open</span>
                  ) : overdue ? (
                    <span className="text-warn">Window missed</span>
                  ) : (
                    formatRelative(Number(imminent.nextExecution), now)
                  )}
                </p>
                <p className="text-[14px] text-mid">
                  <span className="text-hi">{target?.symbol ?? "—"}</span>
                  {quote ? (
                    <>
                      {" · "}
                      {formatQuote(imminent.amountPerCycle, quote.decimals)} {quote.symbol}
                      {" · "}
                      {formatCadence(Number(imminent.interval))}
                    </>
                  ) : null}
                </p>
              </div>

              <TideLine live={Boolean(imminentReadiness?.ready)} className="max-w-[420px]" />

              <p className="max-w-[62ch] text-[13px] leading-[1.55] text-low">
                {copy.detail}
                {overdue && now !== null ? (
                  <span className="text-dim">
                    {" "}
                    Window opened {formatRelative(Number(imminent.nextExecution), now)}.
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* ACTION */}
        <div className="bg-ground py-6 lg:col-span-4 lg:pl-8">
          <p className="t-eyebrow">Needs you</p>
          <div className="mt-3 space-y-3">
            {attention.length === 0 ? (
              <p className="text-[13px] leading-[1.55] text-low">
                {anyReady
                  ? "Nothing. A window is open and the keeper will settle it."
                  : "Nothing. Everything is armed and waiting for its window."}
              </p>
            ) : (
              attention.map((group) => {
                const c = readinessOf(group.reason);
                const scope =
                  group.planIds.length > 1
                    ? `${group.planIds.length} plans · ${group.symbols.join(", ")}`
                    : group.symbols[0];
                return (
                  <SignalRail
                    key={group.reason}
                    tone="warn"
                    title={`${scope} · ${c.label}`}
                    action={
                      c.action === "deposit" ? (
                        <Button size="sm" variant="secondary" onClick={() => onAct("deposit")}>
                          Add capital
                        </Button>
                      ) : c.action === "unpause" ? (
                        <Button size="sm" variant="secondary" onClick={() => onAct("unpause")}>
                          Unpause vault
                        </Button>
                      ) : c.action === "resume" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onAct("resume", group.planIds[0]!)}
                        >
                          Resume {group.planIds.length > 1 ? "plans" : "plan"}
                        </Button>
                      ) : null
                    }
                  >
                    {c.detail}
                  </SignalRail>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
