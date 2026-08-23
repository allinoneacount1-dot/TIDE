"use client";

import { useQuery } from "@tanstack/react-query";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { mockRouterAbi } from "@/lib/abi.generated";
import { getDeployment } from "@/lib/config";

export type Route = {
  /** Contract the vault calls. */
  router: Address;
  /** Contract the vault approves. Differs from `router` in 0x/Permit2 flows. */
  spender: Address;
  /** Calldata for the router. */
  swapData: Hex;
  /** Expected output in target base units, per the venue. */
  expectedOut: bigint;
  /** The venue's own worst-case, before TIDE's on-chain floor is applied. */
  minOut: bigint;
  source: string;
  /** Human breakdown of where the liquidity comes from. */
  fills: { source: string; proportionBps: string }[];
};

export type RouteError = {
  kind: "no_aggregator" | "no_liquidity" | "not_configured" | "unreachable" | "bad_request";
  detail: string;
};

/**
 * Resolves how one cycle will actually be swapped.
 *
 * Two paths, and which one applies is a property of the chain, not a toggle:
 *
 *   • **Simulated market** (devnet, and Robinhood Chain testnet — which has no
 *     DEX aggregator at all) — the route is the mock router deployed alongside
 *     the registry, and the calldata is encoded here from its ABI.
 *
 *   • **Real market** (chain 4663) — the route comes from 0x Swap API v2 via the
 *     server proxy, which returns the venue's calldata and allowance target.
 *
 * Either way the vault re-derives its own floor on chain and measures output as
 * a balance delta, so a wrong or hostile quote costs a reverted transaction, not
 * capital.
 */
export function useRouteQuote({
  chainId,
  vault,
  quote,
  target,
  amountIn,
  slippageBps,
  enabled = true,
}: {
  chainId: number;
  vault: Address | undefined;
  quote: Address | undefined;
  target: Address | undefined;
  amountIn: bigint | undefined;
  slippageBps: number;
  enabled?: boolean;
}) {
  const deployment = getDeployment(chainId);

  return useQuery<Route, RouteError>({
    queryKey: ["tide", "route", chainId, vault, quote, target, amountIn?.toString(), slippageBps],
    enabled: Boolean(enabled && vault && quote && target && amountIn && amountIn > 0n && deployment),
    // A swap route is perishable. Never serve one from cache to a signature.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      if (!vault || !quote || !target || !amountIn || !deployment) {
        throw { kind: "bad_request", detail: "Incomplete route request." } satisfies RouteError;
      }

      if (deployment.simulated) {
        const router = deployment.router;
        if (!router) {
          throw {
            kind: "not_configured",
            detail: "This deployment is simulated but no router address was recorded.",
          } satisfies RouteError;
        }

        const swapData = encodeFunctionData({
          abi: mockRouterAbi,
          functionName: "swap",
          args: [quote, target, amountIn, vault],
        });

        // Ask the router what it would return, rather than assuming — this is a
        // real eth_call against the deployed contract, not an estimate.
        const res = await fetch(
          `/api/simulated-quote?chainId=${chainId}&router=${router}&amountIn=${amountIn.toString()}`
        );
        if (!res.ok) {
          throw { kind: "unreachable", detail: "Could not reach the simulated router." } satisfies RouteError;
        }
        const body = (await res.json()) as { out: string };
        const expectedOut = BigInt(body.out);

        return {
          router,
          spender: router,
          swapData,
          expectedOut,
          minOut: (expectedOut * BigInt(10_000 - slippageBps)) / 10_000n,
          source: "Simulated router",
          fills: [{ source: "TIDE mock venue", proportionBps: "10000" }],
        };
      }

      const params = new URLSearchParams({
        chainId: String(chainId),
        sellToken: quote,
        buyToken: target,
        sellAmount: amountIn.toString(),
        taker: vault,
        slippageBps: String(slippageBps),
      });
      const res = await fetch(`/api/quote?${params}`);
      const body = await res.json();

      if (body.error) {
        throw { kind: body.error, detail: body.detail ?? "No route." } satisfies RouteError;
      }
      if (!body.to || !body.data) {
        throw { kind: "no_liquidity", detail: "The aggregator returned no calldata." } satisfies RouteError;
      }

      return {
        router: body.to as Address,
        spender: (body.allowanceTarget ?? body.to) as Address,
        swapData: body.data as Hex,
        expectedOut: BigInt(body.buyAmount),
        minOut: BigInt(body.minBuyAmount ?? body.buyAmount),
        source: "0x Swap API",
        fills: body.sources ?? [],
      };
    },
  });
}
