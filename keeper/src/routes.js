import { encodeFunctionData } from "viem";
import { mockRouterAbi } from "./abi.js";

const FEE_BPS = 15n;

/**
 * Resolves how a cycle will be swapped.
 *
 * Mirrors the frontend's resolver so the keeper and the UI cannot disagree about
 * what a plan's execution looks like.
 */
export async function resolveRoute({ client, chainId, config, vault, quote, plan, log }) {
  const amountAfterFee = plan.amountPerCycle - (plan.amountPerCycle * FEE_BPS) / 10_000n;

  if (config.simulatedRouter) {
    const expectedOut = await client.readContract({
      address: config.simulatedRouter,
      abi: mockRouterAbi,
      functionName: "quoteOut",
      args: [amountAfterFee],
    });

    return {
      router: config.simulatedRouter,
      spender: config.simulatedRouter,
      swapData: encodeFunctionData({
        abi: mockRouterAbi,
        functionName: "swap",
        args: [quote, plan.target, amountAfterFee, vault],
      }),
      expectedOut,
      minOut: (expectedOut * BigInt(10_000 - plan.maxSlippageBps)) / 10_000n,
      source: "simulated router",
    };
  }

  if (!config.zeroExKey) {
    log.warn("no ZEROX_API_KEY set and this chain has no simulated router — cannot build a route");
    return null;
  }

  const url = new URL("https://api.0x.org/swap/allowance-holder/quote");
  url.searchParams.set("chainId", String(chainId));
  url.searchParams.set("sellToken", quote);
  url.searchParams.set("buyToken", plan.target);
  url.searchParams.set("sellAmount", amountAfterFee.toString());
  url.searchParams.set("taker", vault);
  url.searchParams.set("slippageBps", String(plan.maxSlippageBps));

  const res = await fetch(url, {
    headers: { "0x-api-key": config.zeroExKey, "0x-version": "v2", accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    log.warn(`0x responded ${res.status}`);
    return null;
  }

  const body = await res.json();
  // 0x reports "no route" with a 200 and this flag. Treating it as success is
  // how a keeper ends up broadcasting a transaction that reverts.
  if (body.liquidityAvailable === false || !body.transaction?.to) {
    log.warn("0x has no route for this pair and size");
    return null;
  }

  return {
    router: body.transaction.to,
    spender: body.issues?.allowance?.spender ?? body.allowanceTarget ?? body.transaction.to,
    swapData: body.transaction.data,
    expectedOut: BigInt(body.buyAmount),
    minOut: BigInt(body.minBuyAmount ?? body.buyAmount),
    source: "0x",
  };
}
