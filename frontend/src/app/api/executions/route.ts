import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Blockscout log proxy.
 *
 * Server-side so the browser is not making cross-origin calls to the explorer
 * (Blockscout's CORS policy is not something this app should depend on), and so
 * responses can be cached at the edge — several people watching the same vault
 * cost the explorer one request, not one each.
 */

const EXPLORERS: Record<number, string> = {
  4663: "https://robinhoodchain.blockscout.com",
  46630: "https://explorer.testnet.chain.robinhood.com",
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vault = searchParams.get("vault");
  const chainId = Number(searchParams.get("chainId"));

  // Validate before forwarding. This endpoint takes a caller-controlled address
  // and builds a URL from it; unvalidated, that is an SSRF primitive.
  if (!vault || !ADDRESS_RE.test(vault)) {
    return NextResponse.json({ error: "invalid vault address" }, { status: 400 });
  }
  const base = EXPLORERS[chainId];
  if (!base) {
    return NextResponse.json({ error: "no indexer for this chain" }, { status: 404 });
  }

  try {
    const upstream = await fetch(`${base}/api/v2/addresses/${vault}/logs`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 10 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `indexer responded ${upstream.status}` },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    const body = await upstream.json();
    return NextResponse.json(body, {
      headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "indexer unreachable" },
      { status: 504, headers: { "cache-control": "no-store" } }
    );
  }
}
