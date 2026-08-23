"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { getChain, isSupportedChain, DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isConfigured } from "@/lib/config";

/**
 * Network state, stated plainly.
 *
 * Three distinct problems get three distinct messages, because the fix differs:
 * the wallet is on an unknown chain, the wallet is on a known chain TIDE is not
 * deployed to, or the switch itself was refused. Collapsing them into one
 * "wrong network" banner leaves the user guessing which.
 */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  if (!isConnected) return null;

  const target = getChain(DEFAULT_CHAIN_ID);
  const supported = isSupportedChain(chainId);
  const deployed = isConfigured(chainId);

  if (supported && deployed) return null;

  return (
    <div className="shell py-3">
      <SignalRail
        tone="warn"
        title={supported ? "Not deployed here" : "Unsupported network"}
        action={
          target ? (
            <Button
              size="sm"
              variant="primary"
              busy={isPending}
              onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
            >
              Switch to {target.name}
            </Button>
          ) : null
        }
      >
        {supported ? (
          <>
            Your wallet is on {getChain(chainId)?.name}, but TIDE has no registry deployed there yet.
            Nothing on this page will read or write until you switch.
          </>
        ) : (
          <>
            Your wallet is on chain {chainId}, which TIDE does not support. Switch to{" "}
            {target?.name ?? "a supported network"} to continue.
          </>
        )}
        {error ? <span className="mt-1 block text-fail">{error.message.slice(0, 140)}</span> : null}
      </SignalRail>
    </div>
  );
}
