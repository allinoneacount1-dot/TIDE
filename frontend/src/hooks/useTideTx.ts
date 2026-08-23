"use client";

import { useCallback, useRef, useState } from "react";
import { useAccount, useConfig, usePublicClient } from "wagmi";
import { simulateContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import type { Abi, Address, Hash } from "viem";
import { classifyError, type TxPhase } from "@/lib/lifecycle";

export type TxRequest = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  /** Chain this call must run on. Mismatch short-circuits to wrong-network. */
  chainId: number;
  /** Short human label, shown in the tracker and the toast. */
  label: string;
  /** Skip simulation. Only for calls whose revert conditions are already
   *  checked in the UI and where the extra RPC round-trip hurts. */
  skipSimulation?: boolean;
};

export type TxState = {
  phase: TxPhase;
  label: string | null;
  hash: Hash | null;
  error: string | null;
  blockNumber: bigint | null;
  gasUsed: bigint | null;
};

const IDLE: TxState = {
  phase: "idle",
  label: null,
  hash: null,
  error: null,
  blockNumber: null,
  gasUsed: null,
};

/**
 * One on-chain action, tracked through its real lifecycle.
 *
 * The contract this hook enforces, and the reason it exists:
 *
 *   • **Simulate first.** Every write is simulated against current chain state
 *     before the wallet is opened. A plan that is not due, a router that is not
 *     allowlisted, an allowance that is short — all of it surfaces as readable
 *     copy *before* the user signs, instead of as a failed transaction they
 *     paid for.
 *
 *   • **Submitted is not confirmed.** These are separate phases because they are
 *     separate facts. Nothing reports success until a receipt comes back with
 *     status "success"; a receipt with status "reverted" is a failure even
 *     though the transaction was mined.
 *
 *   • **Timeouts are their own outcome.** If no receipt arrives inside the wait
 *     window the state is `timeout`, not `failed` — the transaction may still
 *     land, and telling someone it failed when it may not have is worse than
 *     telling them you do not know.
 */
export function useTideTx() {
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const [state, setState] = useState<TxState>(IDLE);
  const seq = useRef(0);

  const reset = useCallback(() => {
    seq.current += 1;
    setState(IDLE);
  }, []);

  const send = useCallback(
    async (req: TxRequest): Promise<{ ok: boolean; hash?: Hash }> => {
      const ticket = ++seq.current;
      const settle = (next: Partial<TxState>) => {
        // A superseded call must never overwrite the state of a newer one.
        if (ticket !== seq.current) return;
        setState((prev) => ({ ...prev, ...next }));
      };

      settle({ ...IDLE, label: req.label, phase: "idle" });

      if (!address) {
        settle({ phase: "wallet-required", label: req.label });
        return { ok: false };
      }
      if (walletChainId !== req.chainId) {
        settle({ phase: "wrong-network", label: req.label });
        return { ok: false };
      }

      try {
        if (!req.skipSimulation) {
          settle({ phase: "simulating", label: req.label });
          await simulateContract(config, {
            address: req.address,
            abi: req.abi,
            functionName: req.functionName,
            args: req.args as never,
            account: address,
            chainId: req.chainId as never,
          });
        }

        settle({ phase: "awaiting-signature", label: req.label });
        const hash = await writeContract(config, {
          address: req.address,
          abi: req.abi,
          functionName: req.functionName,
          args: req.args as never,
          chainId: req.chainId as never,
        });

        settle({ phase: "submitted", hash, label: req.label });
        settle({ phase: "pending", hash, label: req.label });

        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: req.chainId as never,
          // Robinhood Chain's sequencer soft-confirms in well under a second;
          // 90s is a generous ceiling that still fails fast when something is
          // actually wrong with the endpoint.
          timeout: 90_000,
          confirmations: 1,
        });

        if (receipt.status === "reverted") {
          settle({
            phase: "reverted",
            hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            error: "The chain included this transaction and the contract rejected it. Gas was spent.",
          });
          return { ok: false, hash };
        }

        settle({
          phase: "confirmed",
          hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
        });
        return { ok: true, hash };
      } catch (error) {
        const { phase, message } = classifyError(error);
        settle({ phase, error: message });
        return { ok: false };
      }
    },
    [address, walletChainId, config]
  );

  return { ...state, send, reset, publicClient };
}
