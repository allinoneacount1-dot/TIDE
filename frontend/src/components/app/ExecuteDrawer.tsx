"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { Review, ReviewRow } from "@/components/tx/Review";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import { useRouteQuote } from "@/hooks/useRouteQuote";
import type { Plan, TargetAsset, TokenMeta } from "@/hooks/useTide";
import { tideVaultAbi } from "@/lib/abi.generated";
import { formatQuote, formatUnitsExact, formatPrice, shortAddress, PRICE_SCALE } from "@/lib/format";
import { getChain } from "@/lib/chains";
import { readinessOf, Readiness } from "@/lib/readiness";

const FEE_BPS = 15n;

/**
 * Manual execution.
 *
 * The keeper normally does this on a schedule; this is the owner doing it by
 * hand — permitted by the contract (`onlyOwnerOrKeeper`) and necessary in
 * practice, because Robinhood Chain has neither Gelato nor Chainlink Automation,
 * so a self-hosted keeper is the only automation and it can be down.
 *
 * Everything shown before the signature is real: the route comes from the venue
 * that will settle it, the expected output is an eth_call against that venue,
 * and the floor is `requiredOutFor` read off the vault. Nothing here is
 * estimated in the client.
 */
export function ExecuteDrawer({
  open,
  onClose,
  vault,
  plan,
  quote,
  target,
  chainId,
  readiness,
  requiredOut,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  vault: Address;
  plan: Plan;
  quote: TokenMeta;
  target: TargetAsset | undefined;
  chainId: number;
  readiness: Readiness | undefined;
  requiredOut: bigint | undefined;
  onDone: () => void;
}) {
  const tx = useTideTx();
  const tracker = useTxTracker();

  const amountAfterFee = useMemo(
    () => plan.amountPerCycle - (plan.amountPerCycle * FEE_BPS) / 10_000n,
    [plan.amountPerCycle]
  );

  const route = useRouteQuote({
    chainId,
    vault,
    quote: quote.address,
    target: plan.target,
    amountIn: amountAfterFee,
    slippageBps: plan.maxSlippageBps,
    enabled: open,
  });

  const ready = readiness === Readiness.Ready;
  const readinessCopy = readinessOf(readiness);
  const busy = tx.phase !== "idle" && tx.phase !== "confirmed" && !tx.error;

  // The venue's quote against TIDE's own on-chain floor. If the quote is below
  // the floor the transaction will revert, and saying so here is cheaper than
  // finding out from a failed transaction.
  const belowFloor =
    route.data && requiredOut !== undefined ? route.data.expectedOut < requiredOut : false;

  const impliedPrice =
    route.data && route.data.expectedOut > 0n && target
      ? (amountAfterFee * 10n ** BigInt(target.decimals) * PRICE_SCALE) /
        (10n ** BigInt(quote.decimals) * route.data.expectedOut)
      : undefined;

  async function submit() {
    if (!route.data) return;
    const label = `Execute cycle ${plan.cyclesExecuted + 1} — ${target?.symbol ?? "plan"}`;
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });

    const result = await tx.send({
      address: vault,
      abi: tideVaultAbi as never,
      functionName: "execute",
      args: [
        BigInt(plan.id),
        route.data.minOut,
        route.data.router,
        route.data.spender,
        route.data.swapData,
      ],
      chainId,
      label,
    });

    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });

    if (result.ok) {
      onDone();
      onClose();
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Execute this cycle"
      width="lg"
      footer={
        <Button
          variant="primary"
          full
          busy={busy || route.isFetching}
          disabled={!ready || !route.data || belowFloor}
          onClick={submit}
        >
          {ready ? "Review complete — sign to execute" : readinessCopy.label}
        </Button>
      }
    >
      <div className="space-y-6">
        {!ready ? (
          <SignalRail tone={readinessCopy.tone === "blocked" ? "fail" : "warn"} title={readinessCopy.label}>
            {readinessCopy.detail}
          </SignalRail>
        ) : null}

        <Review>
          <ReviewRow term="Network" mono={false}>
            {getChain(chainId)?.name}
          </ReviewRow>
          <ReviewRow term="Vault" hint={vault}>
            {shortAddress(vault, 8, 6)}
          </ReviewRow>
          <ReviewRow term="Spends">
            {formatQuote(plan.amountPerCycle, quote.decimals)} {quote.symbol}
          </ReviewRow>
          <ReviewRow term="Protocol fee" tone="muted">
            {formatQuote(plan.amountPerCycle - amountAfterFee, quote.decimals)} {quote.symbol}
          </ReviewRow>
          <ReviewRow term="To market">
            {formatQuote(amountAfterFee, quote.decimals)} {quote.symbol}
          </ReviewRow>
        </Review>

        {route.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : route.error ? (
          <SignalRail tone="fail" title="No route available">
            {route.error.detail}
          </SignalRail>
        ) : route.data ? (
          <>
            <Review>
              <ReviewRow term="Venue" mono={false}>
                {route.data.source}
              </ReviewRow>
              <ReviewRow term="Router" hint={route.data.router}>
                {shortAddress(route.data.router, 8, 6)}
              </ReviewRow>
              {route.data.spender !== route.data.router ? (
                <ReviewRow term="Approves" hint={route.data.spender} tone="warn">
                  {shortAddress(route.data.spender, 8, 6)}
                </ReviewRow>
              ) : null}
              <ReviewRow term="Expected out" tone="signal">
                {target
                  ? `${formatUnitsExact(route.data.expectedOut, target.decimals, 6)} ${target.symbol}`
                  : "—"}
              </ReviewRow>
              <ReviewRow term="Implied price">
                {impliedPrice ? `${formatPrice(impliedPrice)} ${quote.symbol}` : "—"}
              </ReviewRow>
              <ReviewRow
                term="On-chain floor"
                tone={belowFloor ? "fail" : "default"}
                hint="Derived from your limit price and the oracle band. The contract enforces this regardless of what the route claims."
              >
                {requiredOut !== undefined && target
                  ? `${formatUnitsExact(requiredOut, target.decimals, 6)} ${target.symbol}`
                  : "—"}
              </ReviewRow>
              <ReviewRow term="Slippage tolerance" tone="muted">
                {(plan.maxSlippageBps / 100).toFixed(2)}%
              </ReviewRow>
            </Review>

            {route.data.fills.length > 0 ? (
              <div>
                <p className="t-eyebrow">Liquidity</p>
                <ul className="mt-2 space-y-1">
                  {route.data.fills.map((f) => (
                    <li key={f.source} className="flex justify-between text-[12.5px]">
                      <span className="text-mid">{f.source}</span>
                      <span className="t-num text-low">
                        {(Number(f.proportionBps) / 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {belowFloor ? (
          <SignalRail tone="fail" title="Route is below your floor">
            The venue is quoting less than the contract will accept, so this transaction would
            revert. Nothing would be spent except gas. Wait for the price to move back inside your
            guard, or raise your limit price on the plan.
          </SignalRail>
        ) : null}

        {tx.error ? (
          <SignalRail tone="fail" title="Execution failed">
            {tx.error}
          </SignalRail>
        ) : null}
      </div>
    </Drawer>
  );
}
