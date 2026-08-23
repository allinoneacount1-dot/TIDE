import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { rpcFor } from "@/lib/server-rpc";

export const runtime = "nodejs";

/**
 * Asks a deployed simulated router what it would return for a given input.
 *
 * This exists so the simulated path is held to the same standard as the real
 * one: the expected output shown before signing is an `eth_call` against the
 * contract that will settle the trade, not a number recomputed in the client
 * from a price it assumed. If the mock router's price moves, the UI moves.
 */

const ROUTER = parseAbi(["function quoteOut(uint256 amountIn) view returns (uint256)"]);


const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT_RE = /^\d{1,40}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const router = searchParams.get("router");
  const amountIn = searchParams.get("amountIn");
  const chainId = Number(searchParams.get("chainId"));

  if (!router || !ADDRESS_RE.test(router)) {
    return NextResponse.json({ error: "invalid router" }, { status: 400 });
  }
  if (!amountIn || !AMOUNT_RE.test(amountIn)) {
    return NextResponse.json({ error: "invalid amountIn" }, { status: 400 });
  }
  const rpc = rpcFor(chainId);
  if (!rpc) return NextResponse.json({ error: `no RPC for chain ${chainId}` }, { status: 404 });

  try {
    const client = createPublicClient({ transport: http(rpc, { timeout: 6_000 }) });
    const out = await client.readContract({
      address: router as `0x${string}`,
      abi: ROUTER,
      functionName: "quoteOut",
      args: [BigInt(amountIn)],
    });
    return NextResponse.json({ out: out.toString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "router unreachable" },
      { status: 502 }
    );
  }
}
