import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * 0x Swap API v2 proxy (AllowanceHolder flow).
 *
 * Server-side for two reasons, both required rather than stylistic:
 *
 *   1. The `0x-api-key` header is a secret. The previous build read it from
 *      `process.env.ZEROX_API_KEY` inside a route — correct — but the wider
 *      pattern of putting keys near `NEXT_PUBLIC_*` names is how they end up in
 *      a client bundle. It stays here and is never returned to the browser.
 *
 *   2. 0x requires a custom `0x-version` header, which makes the request
 *      non-simple and triggers a CORS preflight the API does not answer for
 *      browsers. 0x's own docs say to call it from a backend.
 *
 * The response is narrowed to exactly the fields the execute flow needs, so a
 * change in 0x's payload cannot silently widen what reaches the client.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT_RE = /^\d{1,40}$/;

/** Chains where 0x actually has coverage. Testnet 46630 is not one of them. */
const SUPPORTED = new Set([4663]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const chainId = Number(searchParams.get("chainId"));
  const sellToken = searchParams.get("sellToken");
  const buyToken = searchParams.get("buyToken");
  const sellAmount = searchParams.get("sellAmount");
  const taker = searchParams.get("taker");
  const slippageBps = searchParams.get("slippageBps") ?? "100";

  if (!sellToken || !ADDRESS_RE.test(sellToken)) {
    return bad("sellToken must be a 20-byte address");
  }
  if (!buyToken || !ADDRESS_RE.test(buyToken)) {
    return bad("buyToken must be a 20-byte address");
  }
  if (!taker || !ADDRESS_RE.test(taker)) {
    return bad("taker must be a 20-byte address");
  }
  if (!sellAmount || !AMOUNT_RE.test(sellAmount)) {
    return bad("sellAmount must be an integer in base units");
  }
  if (!SUPPORTED.has(chainId)) {
    return NextResponse.json(
      {
        error: "no_aggregator",
        detail:
          "0x has no coverage on this chain. Robinhood Chain testnet (46630) has no DEX aggregator at all; use the simulated router deployed alongside the registry.",
      },
      { status: 501 }
    );
  }

  const key = process.env.ZEROX_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "not_configured", detail: "ZEROX_API_KEY is not set on the server." },
      { status: 503 }
    );
  }

  const url = new URL("https://api.0x.org/swap/allowance-holder/quote");
  url.searchParams.set("chainId", String(chainId));
  url.searchParams.set("sellToken", sellToken);
  url.searchParams.set("buyToken", buyToken);
  url.searchParams.set("sellAmount", sellAmount);
  url.searchParams.set("taker", taker);
  url.searchParams.set("slippageBps", slippageBps);

  try {
    const upstream = await fetch(url, {
      headers: { "0x-api-key": key, "0x-version": "v2", accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    const body = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream", status: upstream.status, detail: body?.reason ?? body?.message ?? null },
        { status: 502 }
      );
    }

    // 0x signals "no route" with a 200 and this flag. Treating it as success is
    // how a UI ends up showing a quote of zero.
    if (body?.liquidityAvailable === false) {
      return NextResponse.json(
        { error: "no_liquidity", detail: "No route available for this pair and size." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        buyAmount: body.buyAmount,
        minBuyAmount: body.minBuyAmount,
        sellAmount: body.sellAmount,
        allowanceTarget: body.issues?.allowance?.spender ?? body.allowanceTarget ?? null,
        to: body.transaction?.to ?? null,
        data: body.transaction?.data ?? null,
        value: body.transaction?.value ?? "0",
        gas: body.transaction?.gas ?? null,
        totalNetworkFee: body.totalNetworkFee ?? null,
        sources:
          body.route?.fills?.map((f: { source: string; proportionBps: string }) => ({
            source: f.source,
            proportionBps: f.proportionBps,
          })) ?? [],
      },
      // Quotes go stale fast. A cached swap route is a failed transaction.
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "unreachable", detail: error instanceof Error ? error.message : "aggregator unreachable" },
      { status: 504 }
    );
  }
}

function bad(detail: string) {
  return NextResponse.json({ error: "bad_request", detail }, { status: 400 });
}
