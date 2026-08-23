"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useMotion } from "@/components/motion";
import { EmptyState } from "@/components/data/Ledger";
import type { ExecutionRecord } from "@/lib/indexer";
import { cn } from "@/lib/cn";

/**
 * Execution quality, from TIDE's own records.
 *
 * Two series, both derived entirely from `Executed` events already on chain:
 *
 *   • **Filled** — the price each cycle actually paid, computed on chain as
 *     amountIn/amountOut and emitted in the event. Not a quote, not an estimate.
 *   • **Average cost** — the running weighted average across every cycle so far.
 *     This is the number that decides whether a recurring strategy is working,
 *     and it is the one thing a market chart can never show you.
 *
 * There is no third "market price" series, because TIDE does not have a market
 * price *history* — only the oracle reading at each execution, which is already
 * the reference the guard used. Drawing an interpolated line between those
 * points would imply a continuous series that was never observed. The
 * TradingView panel above covers real market history.
 *
 * Below two executions the chart does not render at all: a line through one
 * point is decoration.
 */
export function CostBasisChart({
  executions,
  quoteSymbol,
  targetSymbol,
  height = 260,
  className,
}: {
  executions: ExecutionRecord[];
  quoteSymbol: string;
  targetSymbol: string;
  height?: number;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { reduced } = useMotion();

  // Chronological, timestamped, deduplicated by second — lightweight-charts
  // rejects a series that is not strictly ascending in time.
  const series = useMemo(() => {
    const usable = executions
      .filter((e) => e.timestamp > 0 && e.amountOut > 0n)
      .sort((a, b) => a.timestamp - b.timestamp);

    let cumIn = 0n;
    let cumOut = 0n;
    const filled: { time: UTCTimestamp; value: number }[] = [];
    const average: { time: UTCTimestamp; value: number }[] = [];
    let last = 0;

    for (const e of usable) {
      const time = (e.timestamp <= last ? last + 1 : e.timestamp) as UTCTimestamp;
      last = time;

      cumIn += e.amountIn;
      cumOut += e.amountOut;

      filled.push({ time, value: Number(e.price) / 1e8 });
      // Weighted average in the same 1e8 units the contract emits, so the two
      // lines are directly comparable.
      const avg = (cumIn * 10n ** 18n * 100_000_000n) / (10n ** 6n * cumOut);
      average.push({ time, value: Number(avg) / 1e8 });
    }

    return { filled, average };
  }, [executions]);

  useEffect(() => {
    const el = holder.current;
    if (!el || series.filled.length < 2) return;

    const chart = createChart(el, {
      height,
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#6f706c",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(246,246,246,0.055)" },
      },
      rightPriceScale: { borderColor: "rgba(246,246,246,0.1)", entireTextOnly: true },
      timeScale: { borderColor: "rgba(246,246,246,0.1)", timeVisible: false },
      crosshair: {
        vertLine: { color: "rgba(212,253,11,0.35)", width: 1, style: LineStyle.Solid, labelBackgroundColor: "#d4fd0b" },
        horzLine: { color: "rgba(246,246,246,0.18)", labelBackgroundColor: "#17171a" },
      },
      handleScale: !reduced,
      handleScroll: !reduced,
    });
    chartRef.current = chart;

    const filled: ISeriesApi<"Line"> = chart.addSeries(LineSeries, {
      color: "rgba(246,246,246,0.42)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      pointMarkersVisible: true,
      pointMarkersRadius: 2.5,
      title: "Filled",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    filled.setData(series.filled);

    const average: ISeriesApi<"Line"> = chart.addSeries(LineSeries, {
      color: "#d4fd0b",
      lineWidth: 2,
      title: "Average cost",
      priceLineVisible: true,
      priceLineColor: "rgba(212,253,11,0.35)",
      priceLineStyle: LineStyle.Dashed,
    });
    average.setData(series.average);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [series, height, reduced]);

  if (series.filled.length < 2) {
    return (
      <EmptyState
        className={className}
        title="Not enough history to plot"
        detail={`A cost-basis line needs at least two settled cycles. After the second execution this shows every fill against your running average price for ${targetSymbol}.`}
      />
    );
  }

  const latestAvg = series.average.at(-1)?.value;
  const latestFill = series.filled.at(-1)?.value;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 px-4 md:px-5">
        <Legend swatch="bg-signal" label="Average cost" value={latestAvg} symbol={quoteSymbol} />
        <Legend swatch="bg-mid/50" label="Last fill" value={latestFill} symbol={quoteSymbol} dotted />
      </div>
      <div ref={holder} style={{ height }} />
    </div>
  );
}

function Legend({
  swatch,
  label,
  value,
  symbol,
  dotted,
}: {
  swatch: string;
  label: string;
  value: number | undefined;
  symbol: string;
  dotted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-px w-4", swatch, dotted && "opacity-60")} />
      <span className="t-eyebrow">{label}</span>
      <span className="t-num text-[13px] text-hi">
        {value === undefined ? "—" : `${value.toFixed(2)} ${symbol}`}
      </span>
    </div>
  );
}
