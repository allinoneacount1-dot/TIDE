"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * TradingView Advanced Chart.
 *
 * Market context for the equity a plan accumulates: candles, intervals, the
 * drawing tools people already know. There is no point rebuilding that, and no
 * honest way to fake it — this is the real instrument's real price history.
 *
 * Two deliberate constraints:
 *
 *   • **It never loads until it is looked at.** The widget pulls a third-party
 *     script and an iframe; mounting it eagerly would put ~500KB and a
 *     cross-origin frame in front of every dashboard visit, including the ones
 *     that never scroll this far. An IntersectionObserver defers it.
 *
 *   • **It is themed to TIDE, not to TradingView.** Background, grid, scale and
 *     candle colours are passed the design tokens so it reads as part of the
 *     product rather than as an embed.
 *
 * The attribution link below is required by TradingView's terms for the free
 * widget, and stays.
 */

/** Tokenized equity ticker → the venue TradingView quotes it on. */
const VENUE: Record<string, string> = {
  AAPL: "NASDAQ:AAPL",
  NVDA: "NASDAQ:NVDA",
  MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL",
  AMZN: "NASDAQ:AMZN",
  META: "NASDAQ:META",
  PLTR: "NASDAQ:PLTR",
  AMD: "NASDAQ:AMD",
  QQQ: "NASDAQ:QQQ",
  SPY: "AMEX:SPY",
  VTI: "AMEX:VTI",
  SGOV: "AMEX:SGOV",
  TSLA: "NASDAQ:TSLA",
};

export function resolveVenue(symbol: string | undefined): string | null {
  if (!symbol) return null;
  return VENUE[symbol.toUpperCase().replace(/\.X$/, "")] ?? null;
}

export function MarketChart({
  symbol,
  height = 380,
  interval = "D",
  className,
}: {
  symbol: string | undefined;
  height?: number;
  interval?: "60" | "D" | "W";
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);
  const venue = resolveVenue(symbol);

  useEffect(() => {
    const el = holder.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    const el = holder.current;
    if (!el || !inView || !venue) return;

    el.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    container.appendChild(widget);
    el.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.onerror = () => setFailed(true);
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: venue,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      // TIDE's own palette, so the embed does not announce itself.
      backgroundColor: "rgba(8, 8, 8, 1)",
      gridColor: "rgba(246, 246, 246, 0.055)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      withdateranges: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [inView, venue, interval]);

  if (!venue) {
    return (
      <div
        className={cn("flex items-center px-4 py-8 md:px-5", className)}
        style={{ minHeight: height / 2 }}
      >
        <div className="space-y-1.5">
          <p className="text-[13px] text-mid">No market chart for this asset.</p>
          <p className="max-w-[46ch] text-[12.5px] leading-5 text-low">
            {symbol
              ? `TIDE has no listed venue mapping for ${symbol}, so there is no external price series to show. Execution history below still comes from the chain.`
              : "Select a plan to see its market."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={holder} style={{ height }} className={cn(!inView && "skeleton")} />
      {failed ? (
        <p className="px-4 py-3 text-[12px] text-warn md:px-5">
          The TradingView widget could not load. This affects market context only — your vault data
          below is read directly from the chain and is unaffected.
        </p>
      ) : null}
      <p className="px-4 pb-3 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim md:px-5">
        Market data ·{" "}
        <a
          href={`https://www.tradingview.com/symbols/${venue.replace(":", "-")}/`}
          target="_blank"
          rel="noopener nofollow"
          className="underline decoration-rule underline-offset-2 transition-colors hover:text-signal"
        >
          TradingView
        </a>
      </p>
    </div>
  );
}
