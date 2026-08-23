import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { rpcFor } from "@/lib/server-rpc";

export const runtime = "nodejs";

/**
 * Reference price, read from the same Chainlink feed the vault's guard uses.
 *
 * This replaces a Pyth Hermes call. Pyth is not deployed on Robinhood Chain —
 * Chainlink is the chain's official oracle partner and the feeds for tokenized
 * equities live there. Quoting a price from an oracle the contract does not
 * consult would mean the number on screen and the number enforcing your trade
 * came from different places.
 *
 * `updatedAt` is returned unmodified so the client can state staleness rather
 * than hide it. Equity feeds are `us_equities_24/5` with an 86400s heartbeat, so
 * a reading that is hours old outside market hours is correct, not broken.
 */

const AGGREGATOR = parseAbi([
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
]);


const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = searchParams.get("feed");
  const chainId = Number(searchParams.get("chainId"));

  if (!feed || !ADDRESS_RE.test(feed)) {
    return NextResponse.json({ error: "feed must be a 20-byte address" }, { status: 400 });
  }
  const rpc = rpcFor(chainId);
  if (!rpc) {
    return NextResponse.json({ error: `no RPC configured for chain ${chainId}` }, { status: 404 });
  }

  try {
    const client = createPublicClient({ transport: http(rpc, { timeout: 6_000 }) });
    const [round, decimals, description] = await Promise.all([
      client.readContract({ address: feed as `0x${string}`, abi: AGGREGATOR, functionName: "latestRoundData" }),
      client.readContract({ address: feed as `0x${string}`, abi: AGGREGATOR, functionName: "decimals" }),
      client
        .readContract({ address: feed as `0x${string}`, abi: AGGREGATOR, functionName: "description" })
        .catch(() => ""),
    ]);

    const [, answer, , updatedAt] = round as readonly [bigint, bigint, bigint, bigint, bigint];

    return NextResponse.json(
      {
        feed,
        chainId,
        description,
        answer: answer.toString(),
        decimals: Number(decimals),
        updatedAt: Number(updatedAt),
        ageSeconds: Math.max(0, Math.floor(Date.now() / 1000) - Number(updatedAt)),
        // Stated, never inferred: a negative or zero answer is not a price.
        valid: answer > 0n,
      },
      { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=45" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "feed unreachable" },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
