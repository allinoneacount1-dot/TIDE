"use client";

import { useMemo, useState } from "react";
import { erc20Abi, maxUint256, type Address } from "viem";
import { useAccount } from "wagmi";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { AmountField } from "@/components/primitives/Field";
import { SignalRail } from "@/components/data/SignalRail";
import { Review, ReviewRow } from "@/components/tx/Review";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import { useAllowance, useTokenBalance, type TokenMeta } from "@/hooks/useTide";
import { tideVaultAbi } from "@/lib/abi.generated";
import { formatQuote, parseUnitsSafe, shortAddress } from "@/lib/format";
import { getChain } from "@/lib/chains";

/**
 * Deposit: approve, then transfer.
 *
 * Two transactions when the allowance is short, one when it is not — and the UI
 * says which before you start, rather than surprising you with a second wallet
 * prompt. The approval is exact by default, not infinite: an unlimited approval
 * to a contract is a standing risk the user did not ask for. There is an option
 * to grant it once for repeated deposits, and it is labelled honestly.
 */
export function DepositDrawer({
  open,
  onClose,
  vault,
  quote,
  chainId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  vault: Address;
  quote: TokenMeta;
  chainId: number;
  onDone: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [infinite, setInfinite] = useState(false);
  const tx = useTideTx();
  const tracker = useTxTracker();

  const { data: balance } = useTokenBalance(quote.address, address);
  const { data: allowance, refetch: refetchAllowance } = useAllowance(quote.address, address, vault);

  const parsed = useMemo(() => parseUnitsSafe(amount, quote.decimals), [amount, quote.decimals]);
  const overBalance = parsed !== null && balance !== undefined && parsed > balance;
  const needsApproval = parsed !== null && allowance !== undefined && allowance < parsed;

  const error =
    amount && parsed === null
      ? `Enter an amount with at most ${quote.decimals} decimal places.`
      : overBalance
        ? "That is more than your wallet holds."
        : null;

  const canSubmit = parsed !== null && parsed > 0n && !overBalance;
  const busy = tx.phase !== "idle" && tx.phase !== "confirmed" && !tx.error;

  async function submit() {
    if (!parsed || !address) return;

    if (needsApproval) {
      const id = tracker.track({
        label: `Approve ${quote.symbol}`,
        phase: "awaiting-signature",
        hash: null,
        error: null,
        chainId,
      });
      const approval = await tx.send({
        address: quote.address,
        abi: erc20Abi as never,
        functionName: "approve",
        args: [vault, infinite ? maxUint256 : parsed],
        chainId,
        label: `Approve ${quote.symbol}`,
      });
      tracker.update(id, { phase: approval.ok ? "confirmed" : tx.phase, hash: approval.hash ?? null });
      if (!approval.ok) return;
      await refetchAllowance();
    }

    const id = tracker.track({
      label: `Deposit ${amount} ${quote.symbol}`,
      phase: "awaiting-signature",
      hash: null,
      error: null,
      chainId,
    });
    const result = await tx.send({
      address: vault,
      abi: tideVaultAbi as never,
      functionName: "deposit",
      args: [parsed],
      chainId,
      label: `Deposit ${amount} ${quote.symbol}`,
    });
    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });

    if (result.ok) {
      setAmount("");
      onDone();
      onClose();
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Deposit capital"
      footer={
        <Button variant="primary" full busy={busy} disabled={!canSubmit} onClick={submit}>
          {needsApproval ? `Approve, then deposit` : "Deposit"}
        </Button>
      }
    >
      <div className="space-y-6">
        <AmountField
          label="Amount"
          value={amount}
          onChange={setAmount}
          symbol={quote.symbol}
          balance={formatQuote(balance, quote.decimals)}
          onMax={() => balance !== undefined && setAmount(formatQuote(balance, quote.decimals).replace(/,/g, ""))}
          error={error}
          autoFocus
        />

        <Review>
          <ReviewRow term="Network" mono={false}>
            {getChain(chainId)?.name}
          </ReviewRow>
          <ReviewRow term="Vault" hint={vault}>
            {shortAddress(vault, 8, 6)}
          </ReviewRow>
          <ReviewRow term="Asset" mono={false}>
            {quote.name}
          </ReviewRow>
          <ReviewRow term="Steps" mono={false} tone={needsApproval ? "warn" : "default"}>
            {needsApproval ? "2 signatures — approve, then deposit" : "1 signature"}
          </ReviewRow>
        </Review>

        {needsApproval ? (
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={infinite}
              onChange={(e) => setInfinite(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#d4fd0b]"
            />
            <span className="text-[12.5px] leading-[1.5] text-low">
              Approve an unlimited amount so future deposits need only one signature.{" "}
              <span className="text-mid">
                This leaves a standing allowance to your vault until you revoke it.
              </span>
            </span>
          </label>
        ) : null}

        <SignalRail tone="neutral" title="Where this goes">
          Straight into your vault&rsquo;s idle balance. It is not deployed until a plan&rsquo;s window
          opens, and you can withdraw it at any point before or after that.
        </SignalRail>

        {tx.error ? (
          <SignalRail tone="fail" title="Transaction failed">
            {tx.error}
          </SignalRail>
        ) : null}
      </div>
    </Drawer>
  );
}
