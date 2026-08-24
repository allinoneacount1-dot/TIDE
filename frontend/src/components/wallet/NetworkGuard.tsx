"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { getChain, isSupportedChain } from "@/lib/chains";
import { isConfigured, switchTarget } from "@/lib/config";

/**
 * Network state, stated plainly.
 *
 * Distinct problems get distinct messages, because the fix differs: the wallet
 * is on an unknown chain, it is on a known chain TIDE is deployed to elsewhere,
 * or TIDE is deployed nowhere at all. Collapsing them into one "wrong network"
 * banner leaves the user guessing which.
 *
 * The last case is the one that used to be wrong. When nothing is deployed
 * anywhere, this offered a button reading "Switch to Robinhood Chain Testnet"
 * to a user already on Robinhood Chain Testnet — an instruction to stay
 * exactly where they were. A switch is only ever offered to a chain that both
 * differs from the current one and actually has a deployment.
 */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  if (!isConnected) return null;

  const supported = isSupportedChain(chainId);
  const deployedHere = isConfigured(chainId);
  if (supported && deployedHere) return null;

  // Somewhere worth sending them: a supported chain that is not this one and
  // has contracts. When there is none, this banner has nothing to offer that
  // the page has not already said, so it renders nothing rather than repeating
  // the same sentence under a second heading.
  const elsewhere = switchTarget(chainId);
  if (!elsewhere) return null;

  const here = getChain(chainId);

  return (
    <div className="shell py-3">
      <SignalRail
        tone="warn"
        title={supported ? "Deployed on another network" : "Unsupported network"}
        action={
          <Button
            size="sm"
            variant="primary"
            busy={isPending}
            onClick={() => switchChain({ chainId: elsewhere.id })}
          >
            Switch to {elsewhere.name}
          </Button>
        }
      >
        {supported ? (
          <>
            Your wallet is on {here?.name ?? `chain ${chainId}`}, where TIDE has no registry. It is
            deployed on {elsewhere.name}.
          </>
        ) : (
          <>
            Your wallet is on chain {chainId}, which TIDE does not support. Switch to{" "}
            {elsewhere.name} to continue.
          </>
        )}
        {error ? <span className="mt-1 block text-fail">{error.message.slice(0, 140)}</span> : null}
      </SignalRail>
    </div>
  );
}
