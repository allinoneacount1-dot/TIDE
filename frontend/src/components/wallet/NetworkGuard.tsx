"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { getChain, isSupportedChain, SUPPORTED_CHAINS, DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isConfigured } from "@/lib/config";

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
  // has contracts. Preference for the default chain when it qualifies.
  const elsewhere =
    SUPPORTED_CHAINS.find((c) => c.id === DEFAULT_CHAIN_ID && c.id !== chainId && isConfigured(c.id)) ??
    SUPPORTED_CHAINS.find((c) => c.id !== chainId && isConfigured(c.id));

  const here = getChain(chainId);

  return (
    <div className="shell py-3">
      <SignalRail
        tone={elsewhere ? "warn" : "neutral"}
        title={
          elsewhere ? (supported ? "Deployed on another network" : "Unsupported network") : "Not deployed yet"
        }
        action={
          elsewhere ? (
            <Button
              size="sm"
              variant="primary"
              busy={isPending}
              onClick={() => switchChain({ chainId: elsewhere.id })}
            >
              Switch to {elsewhere.name}
            </Button>
          ) : null
        }
      >
        {elsewhere ? (
          supported ? (
            <>
              Your wallet is on {here?.name ?? `chain ${chainId}`}, where TIDE has no registry. It is
              deployed on {elsewhere.name}.
            </>
          ) : (
            <>
              Your wallet is on chain {chainId}, which TIDE does not support. Switch to{" "}
              {elsewhere.name} to continue.
            </>
          )
        ) : (
          <>
            TIDE&apos;s contracts are not deployed on any network yet — including{" "}
            {here?.name ?? `chain ${chainId}`}, where your wallet is now. There is nothing to switch
            to. This page will stay read-only until a deployment exists.
          </>
        )}
        {error ? <span className="mt-1 block text-fail">{error.message.slice(0, 140)}</span> : null}
      </SignalRail>
    </div>
  );
}
