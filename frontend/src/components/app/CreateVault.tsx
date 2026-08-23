"use client";

import { useAccount } from "wagmi";
import { Button } from "@/components/primitives/Button";
import { ConnectButton } from "@/components/wallet/ConnectSheet";
import { SignalRail } from "@/components/data/SignalRail";
import { CycleDiagram } from "@/components/tide/CycleDiagram";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import { tideRegistryAbi } from "@/lib/abi.generated";
import type { Deployment } from "@/lib/config";
import { getChain } from "@/lib/chains";

/**
 * Onboarding.
 *
 * Deliberately one action. The first thing someone does here deploys a contract
 * they will own, so the screen explains what is being created and what it costs
 * in trust — and then offers exactly one button. A multi-step wizard before the
 * user has any capital at stake is friction without purpose.
 */
export function CreateVault({
  deployment,
  chainId,
  onCreated,
}: {
  deployment: Deployment;
  chainId: number;
  onCreated: () => void;
}) {
  const { isConnected } = useAccount();
  const tx = useTideTx();
  const tracker = useTxTracker();

  const busy = tx.phase !== "idle" && tx.phase !== "confirmed" && !tx.error;

  async function create() {
    const label = "Create vault";
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });
    const result = await tx.send({
      address: deployment.registry,
      abi: tideRegistryAbi as never,
      functionName: "createVault",
      args: [deployment.quote],
      chainId,
      label,
    });
    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });
    if (result.ok) onCreated();
  }

  return (
    <div className="shell py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="t-eyebrow">Get started</p>
          <h1 className="t-display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
            Deploy a vault you own.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[14.5px] leading-[1.65] text-mid">
            One transaction deploys a minimal-proxy vault on {getChain(chainId)?.name}, owned by your
            address. It holds capital and executes the plans you give it. TIDE cannot withdraw from
            it, cannot retarget it, and cannot pause your ability to exit.
          </p>

          <div className="mt-8">
            {isConnected ? (
              <Button variant="primary" size="lg" busy={busy} onClick={create}>
                Create vault
              </Button>
            ) : (
              <ConnectButton size="lg" label="Connect wallet to begin" />
            )}
          </div>

          {tx.error ? (
            <SignalRail tone="fail" title="Could not create the vault" className="mt-6">
              {tx.error}
            </SignalRail>
          ) : null}

          {deployment.simulated ? (
            <SignalRail tone="warn" title="Simulated market" className="mt-6">
              This network has no real tokenized equities, DEX aggregator or price feeds, so TIDE
              deployed its own mock assets, router and oracles here. The contracts, transactions and
              accounting are real; the market they trade against is not.
            </SignalRail>
          ) : null}
        </div>

        <div className="lg:col-span-6 lg:pt-12">
          <p className="t-eyebrow mb-6">What happens after</p>
          <CycleDiagram />
        </div>
      </div>
    </div>
  );
}
