"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { tideRegistryAbi, tideVaultAbi } from "@/lib/abi.generated";
import { getDeployment, type Deployment } from "@/lib/config";
import { fetchExecutions, type ExecutionPage } from "@/lib/indexer";
import { Readiness } from "@/lib/readiness";

/** Reads that reflect chain state the keeper can change under us. */
const LIVE = { staleTime: 8_000, refetchInterval: 12_000 } as const;
/** Reads that only change when the user acts. */
const STABLE = { staleTime: 60_000 } as const;
/** Immutable for the lifetime of a contract. */
const IMMUTABLE = { staleTime: Infinity, gcTime: Infinity } as const;

export function useTideChain() {
  const chainId = useChainId();
  const deployment = useMemo(() => getDeployment(chainId), [chainId]);
  return { chainId, deployment, configured: Boolean(deployment) };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* tokens                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type TokenMeta = { address: Address; symbol: string; name: string; decimals: number };

/** ERC-20 metadata. Immutable, so it is fetched once and kept. */
export function useToken(address: Address | undefined) {
  const chainId = useChainId();
  const { data, isLoading } = useReadContracts({
    allowFailure: false,
    contracts: address
      ? [
          { address, abi: erc20Abi, functionName: "symbol", chainId },
          { address, abi: erc20Abi, functionName: "name", chainId },
          { address, abi: erc20Abi, functionName: "decimals", chainId },
        ]
      : [],
    query: { enabled: Boolean(address), ...IMMUTABLE },
  });

  const token: TokenMeta | undefined =
    address && data
      ? {
          address,
          symbol: data[0] as string,
          name: data[1] as string,
          decimals: Number(data[2]),
        }
      : undefined;

  return { token, isLoading };
}

export function useTokenBalance(token: Address | undefined, owner: Address | undefined) {
  const chainId = useChainId();
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: Boolean(token && owner), ...LIVE },
  });
}

export function useAllowance(
  token: Address | undefined,
  owner: Address | undefined,
  spender: Address | undefined
) {
  const chainId = useChainId();
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    chainId,
    query: { enabled: Boolean(token && owner && spender), ...STABLE },
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* registry                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function useUserVaults() {
  const { address } = useAccount();
  const { chainId, deployment } = useTideChain();

  const query = useReadContract({
    address: deployment?.registry,
    abi: tideRegistryAbi,
    functionName: "getUserVaults",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: Boolean(deployment && address), ...STABLE },
  });

  return { ...query, vaults: (query.data as Address[] | undefined) ?? [] };
}

export function useProtocolConfig(deployment: Deployment | undefined) {
  const chainId = useChainId();
  const { data } = useReadContracts({
    allowFailure: false,
    contracts: deployment
      ? [
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "feeBps", chainId },
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "treasury", chainId },
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "defaultKeeper", chainId },
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "maxOracleAge", chainId },
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "executionsHalted", chainId },
          { address: deployment.registry, abi: tideRegistryAbi, functionName: "MAX_FEE_BPS", chainId },
        ]
      : [],
    query: { enabled: Boolean(deployment), ...STABLE },
  });

  if (!data) return undefined;
  return {
    feeBps: Number(data[0]),
    treasury: data[1] as Address,
    defaultKeeper: data[2] as Address,
    maxOracleAge: Number(data[3]),
    executionsHalted: data[4] as boolean,
    maxFeeBps: Number(data[5]),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* vault                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type Plan = {
  id: number;
  target: Address;
  maxSlippageBps: number;
  active: boolean;
  targetDecimals: number;
  cyclesExecuted: number;
  cyclesTotal: number;
  amountPerCycle: bigint;
  interval: bigint;
  nextExecution: bigint;
  limitPrice: bigint;
  totalIn: bigint;
  totalOut: bigint;
};

type RawPlan = {
  target: Address;
  maxSlippageBps: number;
  active: boolean;
  targetDecimals: number;
  cyclesExecuted: number;
  cyclesTotal: number;
  amountPerCycle: bigint;
  interval: bigint;
  nextExecution: bigint;
  limitPrice: bigint;
  totalIn: bigint;
  totalOut: bigint;
};

export function useVault(vault: Address | undefined) {
  const chainId = useChainId();

  const core = useReadContracts({
    allowFailure: false,
    contracts: vault
      ? [
          { address: vault, abi: tideVaultAbi, functionName: "owner", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "quote", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "quoteDecimals", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "keeper", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "paused", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "idleCapital", chainId },
          { address: vault, abi: tideVaultAbi, functionName: "getPlans", chainId },
        ]
      : [],
    query: { enabled: Boolean(vault), ...LIVE },
  });

  const plans: Plan[] = useMemo(() => {
    const raw = core.data?.[6] as readonly RawPlan[] | undefined;
    if (!raw) return [];
    return raw.map((p, id) => ({
      id,
      target: p.target,
      maxSlippageBps: Number(p.maxSlippageBps),
      active: p.active,
      targetDecimals: Number(p.targetDecimals),
      cyclesExecuted: Number(p.cyclesExecuted),
      cyclesTotal: Number(p.cyclesTotal),
      amountPerCycle: p.amountPerCycle,
      interval: p.interval,
      nextExecution: p.nextExecution,
      limitPrice: p.limitPrice,
      totalIn: p.totalIn,
      totalOut: p.totalOut,
    }));
  }, [core.data]);

  // Readiness is a separate batch because it is the value that changes without
  // the user doing anything — a window opening, an oracle going stale — so it
  // polls faster than the structural reads above.
  const readiness = useReadContracts({
    allowFailure: true,
    contracts: plans.map((p) => ({
      address: vault!,
      abi: tideVaultAbi,
      functionName: "canExecute" as const,
      args: [BigInt(p.id)] as const,
      chainId,
    })),
    query: { enabled: Boolean(vault) && plans.length > 0, staleTime: 5_000, refetchInterval: 10_000 },
  });

  const readinessById = useMemo(() => {
    const map = new Map<number, { ready: boolean; reason: Readiness; referencePrice: bigint }>();
    readiness.data?.forEach((entry, i) => {
      if (entry.status !== "success") return;
      const [ready, reason, referencePrice] = entry.result as unknown as [boolean, number, bigint];
      map.set(i, { ready, reason: reason as Readiness, referencePrice });
    });
    return map;
  }, [readiness.data]);

  return {
    address: vault,
    isLoading: core.isLoading,
    isError: core.isError,
    refetch: core.refetch,
    owner: core.data?.[0] as Address | undefined,
    quote: core.data?.[1] as Address | undefined,
    quoteDecimals: core.data ? Number(core.data[2]) : undefined,
    keeper: core.data?.[3] as Address | undefined,
    paused: core.data?.[4] as boolean | undefined,
    idleCapital: core.data?.[5] as bigint | undefined,
    plans,
    readinessById,
    readinessLoading: readiness.isLoading,
  };
}

/** Balances of every asset a vault has ever targeted. */
export function useVaultExposure(vault: Address | undefined) {
  const chainId = useChainId();
  const query = useReadContract({
    address: vault,
    abi: tideVaultAbi,
    functionName: "exposure",
    chainId,
    query: { enabled: Boolean(vault), ...LIVE },
  });

  const [tokens, balances] = (query.data as readonly [Address[], bigint[]] | undefined) ?? [[], []];
  return {
    ...query,
    holdings: tokens.map((address, i) => ({ address, balance: balances[i] ?? 0n })),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* history                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export function useExecutions(vault: Address | undefined) {
  const chainId = useChainId();
  const client = usePublicClient({ chainId });

  return useQuery<ExecutionPage>({
    queryKey: ["tide", "executions", chainId, vault],
    enabled: Boolean(vault && client),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: () => fetchExecutions(client!, vault!, chainId),
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* targets                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type TargetAsset = TokenMeta & {
  /** Chainlink aggregator bound in the registry, if any. */
  feed: Address | undefined;
  /** False when no feed is bound — such a plan needs an owner limit price. */
  guarded: boolean;
};

/**
 * Assets a vault can be pointed at on this chain.
 *
 * The list comes from the deployment record (what the deploy script actually
 * published), and each entry's guard status is read live from the registry — so
 * an asset whose feed is later removed stops claiming to be oracle-guarded
 * without a redeploy of the frontend.
 */
export function useAvailableTargets(deployment: Deployment | undefined) {
  const chainId = useChainId();
  // Stabilised: a fresh array literal on every render would invalidate the memo
  // below and re-derive the target list on each pass.
  const addresses = useMemo(() => deployment?.targets ?? [], [deployment]);

  const meta = useReadContracts({
    allowFailure: true,
    contracts: addresses.flatMap((address) => [
      { address, abi: erc20Abi, functionName: "symbol" as const, chainId },
      { address, abi: erc20Abi, functionName: "name" as const, chainId },
      { address, abi: erc20Abi, functionName: "decimals" as const, chainId },
    ]),
    query: { enabled: addresses.length > 0, ...IMMUTABLE },
  });

  const feeds = useReadContracts({
    allowFailure: true,
    contracts: addresses.map((address) => ({
      address: deployment!.registry,
      abi: tideRegistryAbi,
      functionName: "priceFeed" as const,
      args: [address] as const,
      chainId,
    })),
    query: { enabled: Boolean(deployment) && addresses.length > 0, ...STABLE },
  });

  const targets: TargetAsset[] = useMemo(() => {
    if (!meta.data) return [];
    return addresses
      .map((address, i) => {
        const symbol = meta.data![i * 3];
        const name = meta.data![i * 3 + 1];
        const decimals = meta.data![i * 3 + 2];
        if (symbol?.status !== "success" || decimals?.status !== "success") return null;

        const feedEntry = feeds.data?.[i];
        const feed =
          feedEntry?.status === "success" && feedEntry.result !== ZERO ? (feedEntry.result as Address) : undefined;

        return {
          address,
          symbol: symbol.result as string,
          name: (name?.status === "success" ? (name.result as string) : symbol.result) as string,
          decimals: Number(decimals.result),
          feed,
          guarded: Boolean(feed),
        };
      })
      .filter((t): t is TargetAsset => t !== null);
  }, [addresses, meta.data, feeds.data]);

  return { targets, isLoading: meta.isLoading || feeds.isLoading };
}

const ZERO = "0x0000000000000000000000000000000000000000";
