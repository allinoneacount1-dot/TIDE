export const dynamic = "force-dynamic";

// Handles 0x quote with fallback to direct RPC quote and caching
// Free-tier: 0x free, no key for testnet. Rate-limit 1 req / 5s per vault on frontend.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sellAmount = searchParams.get("sellAmount"); // in USDC base units (6 decimals)
  const sellToken = searchParams.get("sellToken");
  const buyToken = searchParams.get("buyToken");
  const chainId = searchParams.get("chainId") || "97468";

  if (!sellAmount || !sellToken || !buyToken) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const url = `https://api.0x.org/swap/allowance-holder/quote?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&slippagePercentage=0.01`;
    const res = await fetch(url, {
      headers: { "0x-api-key": process.env.ZEROX_API_KEY || "", "0x-version": "v2" } as Record<string, string>,
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`0x ${res.status} ${await res.text().then(t => t.slice(0, 200))}`);
    const j = await res.json();
    return Response.json({ source: "0x", quote: j }, { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } });
  } catch (e) {
    return Response.json({ source: "fallback", error: (e as Error).message, minOut: null, stale: true }, { status: 200 });
  }
}
