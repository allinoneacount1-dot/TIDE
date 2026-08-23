"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { AmountField } from "@/components/primitives/Field";
import { Segmented } from "@/components/primitives/Segmented";
import { SignalRail } from "@/components/data/SignalRail";
import { Review, ReviewRow } from "@/components/tx/Review";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import { tideVaultAbi } from "@/lib/abi.generated";
import { formatUnitsExact, parseUnitsSafe, shortAddress } from "@/lib/format";
import { getChain } from "@/lib/chains";

export type WithdrawableAsset = { address: Address; symbol: string; decimals: number; balance: bigint };

/**
 * Withdraw.
 *
 * Lists every asset the vault holds, not just the one it spends. That is the
 * whole point of the redesign: the previous vault could accumulate an equity
 * token and had no function capable of returning it, so anything bought was
 * permanently stranded. Here each holding is withdrawable by address, and
 * "Withdraw everything" empties the vault in a single transaction.
 *
 * This drawer stays usable while the vault is paused and while the protocol is
 * halted, because the contract keeps the exit open in both states.
 */
export function WithdrawDrawer({
  open,
  onClose,
  vault,
  assets,
  chainId,
  paused,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  vault: Address;
  assets: WithdrawableAsset[];
  chainId: number;
  paused?: boolean;
  onDone: () => void;
}) {
  const { address } = useAccount();
  const [mode, setMode] = useState<"single" | "all">("single");
  const [selected, setSelected] = useState<Address | undefined>(assets[0]?.address);
  const [amount, setAmount] = useState("");
  const tx = useTideTx();
  const tracker = useTxTracker();

  const asset = useMemo(
    () => assets.find((a) => a.address === selected) ?? assets[0],
    [assets, selected]
  );

  const parsed = useMemo(
    () => (asset ? parseUnitsSafe(amount, asset.decimals) : null),
    [amount, asset]
  );
  const over = parsed !== null && asset ? parsed > asset.balance : false;

  const error =
    amount && parsed === null
      ? "That is not a valid amount."
      : over
        ? "The vault does not hold that much."
        : null;

  const nonEmpty = assets.filter((a) => a.balance > 0n);
  const canSubmit =
    mode === "all" ? nonEmpty.length > 0 : Boolean(asset) && parsed !== null && parsed > 0n && !over;
  const busy = tx.phase !== "idle" && tx.phase !== "confirmed" && !tx.error;

  async function submit() {
    if (!address) return;

    const label =
      mode === "all"
        ? "Withdraw everything"
        : `Withdraw ${amount} ${asset?.symbol ?? ""}`;

    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });

    const result =
      mode === "all"
        ? await tx.send({
            address: vault,
            abi: tideVaultAbi as never,
            functionName: "exitAll",
            args: [address],
            chainId,
            label,
          })
        : await tx.send({
            address: vault,
            abi: tideVaultAbi as never,
            functionName: "withdraw",
            args: [asset!.address, parsed!, address],
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
      onDone();
      onClose();
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Withdraw"
      footer={
        <Button variant="primary" full busy={busy} disabled={!canSubmit} onClick={submit}>
          {mode === "all" ? "Withdraw everything" : "Withdraw"}
        </Button>
      }
    >
      <div className="space-y-6">
        <Segmented
          label="Withdrawal mode"
          value={mode}
          onChange={setMode}
          className="w-full"
          options={[
            { value: "single", label: "One asset" },
            { value: "all", label: "Everything" },
          ]}
        />

        {mode === "single" ? (
          <>
            <div className="space-y-1.5">
              <label htmlFor="withdraw-asset" className="t-eyebrow">
                Asset
              </label>
              <select
                id="withdraw-asset"
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value as Address);
                  setAmount("");
                }}
                className="chamfer-sm h-11 w-full bg-raised px-3 text-[13px] text-hi outline-none ring-1 ring-inset ring-rule transition-colors focus:ring-signal-edge"
              >
                {assets.map((a) => (
                  <option key={a.address} value={a.address}>
                    {a.symbol} — {formatUnitsExact(a.balance, a.decimals, 6)}
                  </option>
                ))}
              </select>
            </div>

            {asset ? (
              <AmountField
                label="Amount"
                value={amount}
                onChange={setAmount}
                symbol={asset.symbol}
                balance={formatUnitsExact(asset.balance, asset.decimals, 6)}
                onMax={() => setAmount(formatUnitsExact(asset.balance, asset.decimals, asset.decimals))}
                error={error}
              />
            ) : null}
          </>
        ) : (
          <Review>
            {nonEmpty.length === 0 ? (
              <ReviewRow term="Holdings" tone="muted" mono={false}>
                The vault is empty.
              </ReviewRow>
            ) : (
              nonEmpty.map((a) => (
                <ReviewRow key={a.address} term={a.symbol}>
                  {formatUnitsExact(a.balance, a.decimals, 6)}
                </ReviewRow>
              ))
            )}
          </Review>
        )}

        <Review>
          <ReviewRow term="Network" mono={false}>
            {getChain(chainId)?.name}
          </ReviewRow>
          <ReviewRow term="From" hint={vault}>
            {shortAddress(vault, 8, 6)}
          </ReviewRow>
          <ReviewRow term="To" hint={address}>
            {shortAddress(address, 8, 6)}
          </ReviewRow>
        </Review>

        {paused ? (
          <SignalRail tone="neutral" title="Vault is paused">
            Pausing stops deposits and executions. It has never blocked withdrawal — the exit stays
            open in every state, including a protocol-wide halt.
          </SignalRail>
        ) : null}

        {tx.error ? (
          <SignalRail tone="fail" title="Transaction failed">
            {tx.error}
          </SignalRail>
        ) : null}
      </div>
    </Drawer>
  );
}
