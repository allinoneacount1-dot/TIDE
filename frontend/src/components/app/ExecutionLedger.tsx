"use client";

import { Ledger, EmptyState, type Column } from "@/components/data/Ledger";
import { CopyButton } from "@/components/primitives/CopyButton";
import { Tag } from "@/components/primitives/Tag";
import type { ExecutionRecord, ExecutionPage } from "@/lib/indexer";
import type { TargetAsset, TokenMeta } from "@/hooks/useTide";
import { explorerTxUrl } from "@/lib/chains";
import { formatPrice, formatQuote, formatTimestamp, formatUnitsExact, priceDelta, shortHash } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * EXECUTION — the record.
 *
 * Every row is one `Executed` event. `amountIn`, `amountOut` and `price` are the
 * values the contract itself computed and logged; nothing is recalculated in the
 * client, so what is shown is what settled.
 *
 * The "vs oracle" column is the honest quality measure: the realised price
 * against the Chainlink reading the guard used at that block. Positive means the
 * fill beat the reference. It is the only performance number TIDE can state
 * without modelling anything.
 */
export function ExecutionLedger({
  page,
  quote,
  targets,
  chainId,
  loading,
}: {
  page: ExecutionPage | undefined;
  quote: TokenMeta | undefined;
  targets: TargetAsset[];
  chainId: number;
  loading: boolean;
}) {
  const rows = page?.records ?? [];

  const columns: Column<ExecutionRecord>[] = [
    {
      key: "time",
      header: "Settled",
      cell: (e) =>
        e.timestamp > 0 ? (
          formatTimestamp(e.timestamp)
        ) : (
          <span className="text-dim">block {e.blockNumber.toString()}</span>
        ),
    },
    {
      key: "asset",
      header: "Asset",
      cell: (e) => targets.find((t) => t.address === e.target)?.symbol ?? "—",
    },
    {
      key: "in",
      header: `In${quote ? ` (${quote.symbol})` : ""}`,
      numeric: true,
      cell: (e) => (quote ? formatQuote(e.amountIn, quote.decimals) : "—"),
    },
    {
      key: "out",
      header: "Out",
      numeric: true,
      cell: (e) => {
        const t = targets.find((x) => x.address === e.target);
        return formatUnitsExact(e.amountOut, t?.decimals ?? 18, 6);
      },
    },
    {
      key: "price",
      header: "Filled at",
      numeric: true,
      cell: (e) => formatPrice(e.price),
    },
    {
      key: "quality",
      header: "vs oracle",
      numeric: true,
      secondary: true,
      cell: (e) => {
        if (e.referencePrice === 0n) return <span className="text-dim">no feed</span>;
        // Lower filled price is better, so the sign is inverted relative to a
        // raw price change.
        const d = priceDelta(e.referencePrice, e.price);
        if (!d) return <span className="text-dim">—</span>;
        return (
          <span
            className={cn(
              d.direction === "up" ? "text-signal" : d.direction === "down" ? "text-warn" : "text-mid"
            )}
          >
            {d.text}
          </span>
        );
      },
    },
    {
      key: "fee",
      header: "Fee",
      numeric: true,
      secondary: true,
      cell: (e) => (quote ? formatQuote(e.fee, quote.decimals) : "—"),
    },
    {
      key: "tx",
      header: "Transaction",
      cell: (e) => {
        const url = explorerTxUrl(chainId, e.txHash);
        return (
          <span className="flex items-center justify-end gap-1">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="t-mono text-[12px] underline decoration-rule underline-offset-2 transition-colors hover:text-signal"
              >
                {shortHash(e.txHash)}
              </a>
            ) : (
              <span className="t-mono text-[12px]">{shortHash(e.txHash)}</span>
            )}
            <CopyButton value={e.txHash} label="Copy transaction hash" />
          </span>
        );
      },
    },
  ];

  return (
    <section aria-label="Execution history" className="border-b border-hairline">
      <div className="shell py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-eyebrow">Execution history</h2>
          {page ? (
            <div className="flex items-center gap-2">
              <Tag tone={page.source === "blockscout" ? "outline" : page.partial ? "warn" : "outline"}>
                {page.source === "blockscout" ? "Indexed" : page.source === "rpc" ? "Direct node" : "Unavailable"}
              </Tag>
              <span className="text-[11px] text-dim">{page.coverage}</span>
            </div>
          ) : null}
        </div>

        <Ledger
          caption="Settled executions for this vault"
          columns={columns}
          rows={rows}
          keyOf={(e) => `${e.txHash}-${e.planId}-${e.cycle}`}
          loading={loading}
          empty={
            <EmptyState
              className="!px-0"
              title="No executions yet"
              detail="Each settled cycle is written here from its on-chain event — amount in, amount out, the price it filled at, and the oracle reading the guard used. Nothing appears until a cycle actually settles."
            />
          }
        />
      </div>
    </section>
  );
}
