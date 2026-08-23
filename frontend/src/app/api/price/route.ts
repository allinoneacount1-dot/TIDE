export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "AAPL";

  // Primary: Pyth Hermes (free, no key)
  // Fallback: cached stale value
  try {
    const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`, {
      // pyth feedId example — replace with real AAPL feedId from pyth.network/price-feeds
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`pyth ${res.status}`);
    const json = await res.json();
    // normalize to { price, conf, publishTime, stale }
    return Response.json({ symbol, source: "pyth", data: json, stale: false }, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  } catch (e) {
    // Fallback: try secondary or return stale indicator
    return Response.json(
      { symbol, source: "cache", error: (e as Error).message, stale: true, price: null },
      { status: 200, headers: { "Cache-Control": "s-maxage=30" } }
    );
  }
}
