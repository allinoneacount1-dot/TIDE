"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { AmountField, Field } from "@/components/primitives/Field";
import { Segmented } from "@/components/primitives/Segmented";
import { SignalRail } from "@/components/data/SignalRail";
import { Review, ReviewRow } from "@/components/tx/Review";
import { Tag } from "@/components/primitives/Tag";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import type { TargetAsset, TokenMeta } from "@/hooks/useTide";
import { tideVaultAbi } from "@/lib/abi.generated";
import { CADENCES, PROTOCOL } from "@/lib/config";
import { formatCadence, formatQuote, parseUnitsSafe, PRICE_SCALE } from "@/lib/format";

/**
 * Plan editor.
 *
 * The one screen where the user makes a decision the protocol will act on
 * without them. So it is built around the three things that actually determine
 * the outcome — how much, how often, and the worst price acceptable — and it
 * refuses to submit a configuration the contract would not execute.
 *
 * The limit price is not an optional extra. For an asset with no registry
 * oracle it is the only guard that exists, and the form enforces that rather
 * than letting the user create a plan whose readiness will forever read
 * "Unguarded".
 */
export function PlanDrawer({
  open,
  onClose,
  vault,
  quote,
  targets,
  chainId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  vault: Address;
  quote: TokenMeta;
  targets: TargetAsset[];
  chainId: number;
  onDone: () => void;
}) {
  const [targetAddress, setTargetAddress] = useState<Address | undefined>(targets[0]?.address);
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<number>(604_800);
  const [limitPrice, setLimitPrice] = useState("");
  const [slippage, setSlippage] = useState(100);
  const [cycles, setCycles] = useState("");
  const [startNow, setStartNow] = useState(false);

  const tx = useTideTx();
  const tracker = useTxTracker();

  useEffect(() => {
    if (!targetAddress && targets[0]) setTargetAddress(targets[0].address);
  }, [targets, targetAddress]);

  const target = useMemo(
    () => targets.find((t) => t.address === targetAddress),
    [targets, targetAddress]
  );

  const parsedAmount = useMemo(() => parseUnitsSafe(amount, quote.decimals), [amount, quote.decimals]);
  // Limit price is expressed in whole quote units per whole target unit, on the
  // same 1e8 scale the contract and Chainlink both use.
  const parsedLimit = useMemo(() => parseUnitsSafe(limitPrice, 8), [limitPrice]);
  const parsedCycles = cycles.trim() === "" ? 0 : Number(cycles);

  const limitRequired = Boolean(target && !target.guarded);
  const limitMissing = limitRequired && (!parsedLimit || parsedLimit === 0n);

  const amountError =
    amount && parsedAmount === null
      ? `At most ${quote.decimals} decimal places.`
      : parsedAmount !== null && parsedAmount === 0n
        ? "Amount must be greater than zero."
        : null;

  const limitError =
    limitPrice && parsedLimit === null
      ? "Enter a price like 182.40"
      : limitMissing
        ? "This asset has no registry price feed, so a limit price is required."
        : null;

  const cyclesError =
    cycles.trim() !== "" && (!Number.isInteger(parsedCycles) || parsedCycles < 0)
      ? "Whole number of cycles, or leave blank for open-ended."
      : null;

  const canSubmit =
    Boolean(target) &&
    parsedAmount !== null &&
    parsedAmount > 0n &&
    !limitMissing &&
    !limitError &&
    !cyclesError;

  const busy = tx.phase !== "idle" && tx.phase !== "confirmed" && !tx.error;

  // What one cycle buys at the stated limit — the ceiling, not a prediction.
  const sharesAtLimit = useMemo(() => {
    if (!parsedAmount || !parsedLimit || parsedLimit === 0n || !target) return null;
    const net = parsedAmount - (parsedAmount * BigInt(15)) / 10_000n;
    return (net * 10n ** BigInt(target.decimals) * PRICE_SCALE) / (10n ** BigInt(quote.decimals) * parsedLimit);
  }, [parsedAmount, parsedLimit, target, quote.decimals]);

  async function submit() {
    if (!target || !parsedAmount) return;

    const label = `Create plan — ${target.symbol} ${formatCadence(cadence)}`;
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });

    const result = await tx.send({
      address: vault,
      abi: tideVaultAbi as never,
      functionName: "createPlan",
      args: [
        target.address,
        parsedAmount,
        BigInt(cadence),
        BigInt(startNow ? 0 : cadence),
        parsedLimit ?? 0n,
        slippage,
        parsedCycles,
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
      setAmount("");
      setLimitPrice("");
      setCycles("");
      onDone();
      onClose();
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New plan"
      width="lg"
      footer={
        <Button variant="primary" full busy={busy} disabled={!canSubmit} onClick={submit}>
          Create plan
        </Button>
      }
    >
      <div className="space-y-6">
        {targets.length === 0 ? (
          <SignalRail tone="warn" title="No assets available">
            This deployment has no target assets recorded. Deploy the registry with at least one
            target, or set one in the registry, before creating a plan.
          </SignalRail>
        ) : null}

        <Field label="Buy" htmlFor="plan-target">
          <select
            id="plan-target"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value as Address)}
            className="chamfer-sm h-11 w-full bg-raised px-3 text-[13px] text-hi outline-none ring-1 ring-inset ring-rule transition-colors focus:ring-signal-edge"
          >
            {targets.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol} — {t.name}
              </option>
            ))}
          </select>
        </Field>

        {target ? (
          <div className="flex flex-wrap items-center gap-2">
            {target.guarded ? (
              <Tag tone="signal">Oracle guarded</Tag>
            ) : (
              <Tag tone="warn">No price feed</Tag>
            )}
            <span className="text-[12px] text-low">
              {target.guarded
                ? "Executions are checked against the registry's Chainlink feed."
                : "Your limit price will be the only guard on this plan."}
            </span>
          </div>
        ) : null}

        <AmountField
          label="Amount per cycle"
          value={amount}
          onChange={setAmount}
          symbol={quote.symbol}
          error={amountError}
          hint="Spent each time the window opens"
        />

        <Field label="Cadence" hint={formatCadence(cadence)}>
          <Segmented
            label="Cadence"
            value={cadence}
            onChange={setCadence}
            className="w-full"
            options={CADENCES.map((c) => ({ value: c.seconds, label: c.label, hint: c.note }))}
          />
        </Field>

        <AmountField
          label={limitRequired ? "Limit price (required)" : "Limit price (optional)"}
          value={limitPrice}
          onChange={setLimitPrice}
          symbol={`${quote.symbol} / ${target?.symbol ?? "unit"}`}
          error={limitError}
          hint="The most you will ever pay"
        />

        <Field
          label="Slippage tolerance"
          hint={`${(slippage / 100).toFixed(2)}% below the oracle reference`}
          htmlFor="plan-slippage"
        >
          <input
            id="plan-slippage"
            type="range"
            min={0}
            max={PROTOCOL.maxSlippageBps}
            step={25}
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-raised accent-[#d4fd0b]"
          />
        </Field>

        <Field
          label="Number of cycles"
          hint="Blank = open-ended"
          error={cyclesError}
          htmlFor="plan-cycles"
        >
          <input
            id="plan-cycles"
            value={cycles}
            onChange={(e) => /^\d*$/.test(e.target.value) && setCycles(e.target.value)}
            inputMode="numeric"
            placeholder="Unlimited"
            className="chamfer-sm t-num h-11 w-full bg-raised px-3 text-[13px] text-hi outline-none ring-1 ring-inset ring-rule transition-colors placeholder:text-dim focus:ring-signal-edge"
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={startNow}
            onChange={(e) => setStartNow(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#d4fd0b]"
          />
          <span className="text-[12.5px] leading-[1.5] text-low">
            Open the first window immediately.{" "}
            <span className="text-mid">Otherwise the first buy happens one full cycle from now.</span>
          </span>
        </label>

        <Review>
          <ReviewRow term="Spends" mono={false}>
            {parsedAmount ? `${formatQuote(parsedAmount, quote.decimals)} ${quote.symbol}` : "—"}{" "}
            {formatCadence(cadence)}
          </ReviewRow>
          <ReviewRow term="Ceiling" tone={parsedLimit ? "default" : "muted"}>
            {parsedLimit ? `${limitPrice} ${quote.symbol}` : "Oracle band only"}
          </ReviewRow>
          <ReviewRow term="Buys at least" tone="signal">
            {sharesAtLimit && target
              ? `${(Number(sharesAtLimit) / 10 ** target.decimals).toFixed(6)} ${target.symbol}`
              : "—"}
          </ReviewRow>
          <ReviewRow term="Runs for" mono={false}>
            {parsedCycles > 0 ? `${parsedCycles} cycles` : "Until you stop it"}
          </ReviewRow>
        </Review>

        <SignalRail tone="neutral" title="You stay in control">
          A plan can be paused, edited or retired at any time, and pausing it never affects your
          ability to withdraw. Changing the cadence re-schedules the next window forward — it can
          never make a plan retroactively due.
        </SignalRail>

        {tx.error ? (
          <SignalRail tone="fail" title="Could not create the plan">
            {tx.error}
          </SignalRail>
        ) : null}
      </div>
    </Drawer>
  );
}
