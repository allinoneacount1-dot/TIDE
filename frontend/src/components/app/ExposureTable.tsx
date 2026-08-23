"use client";

import type { Address } from "viem";
import { Ledger, EmptyState, type Column } from "@/components/data/Ledger";
import { Tag } from "@/components/primitives/Tag";
import type { TargetAsset } from "@/hooks/useTide";
import { formatPrice, formatUnitsExact, shortAddress } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/chains";

export type Holding = { address: Address; balance: bigint };

/**
 * EXPOSURE — what the vault actually holds.
 *
 * Balances are read from the token contracts, not accumulated from events, so a
 * transfer that happened outside TIDE still shows up. Reference price comes from
 * the same Chainlink feed the execution guard consults, and is omitted rather
 * than guessed where no feed exists — an asset with no oracle shows a dash, not
 * a zero.
 */
export function ExposureTable({
  holdings,
  targets,
  referencePrices,
  chainId,
  loading,
}: {
  holdings: Holding[];
  targets: TargetAsset[];
  referencePrices: Map<Address, bigint>;
  chainId: number;
  loading: boolean;
}) {
  const rows = holdings.filter((h) => h.balance > 0n);

  const columns: Column<Holding>[] = [
    {
      key: "asset",
      header: "Asset",
      cell: (h) => {
        const t = targets.find((x) => x.address === h.address);
        return (
          <span className="flex items-center gap-2">
            <span className="font-medium text-hi">{t?.symbol ?? shortAddress(h.address)}</span>
            {t && !t.guarded ? <Tag tone="warn">No feed</Tag> : null}
          </span>
        );
      },
    },
    {
      key: "balance",
      header: "Balance",
      numeric: true,
      cell: (h) => {
        const t = targets.find((x) => x.address === h.address);
        return formatUnitsExact(h.balance, t?.decimals ?? 18, 6);
      },
    },
    {
      key: "reference",
      header: "Reference price",
      numeric: true,
      secondary: true,
      cell: (h) => {
        const p = referencePrices.get(h.address);
        return p && p > 0n ? formatPrice(p) : <span className="text-dim">—</span>;
      },
    },
    {
      key: "contract",
      header: "Contract",
      secondary: true,
      cell: (h) => {
        const url = explorerAddressUrl(chainId, h.address);
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="t-mono text-[12px] underline decoration-rule underline-offset-2 transition-colors hover:text-signal"
          >
            {shortAddress(h.address)}
          </a>
        ) : (
          <span className="t-mono text-[12px]">{shortAddress(h.address)}</span>
        );
      },
    },
  ];

  return (
    <section aria-label="Exposure" className="border-b border-hairline">
      <div className="shell py-6">
        <h2 className="t-eyebrow mb-4">Exposure</h2>
        <Ledger
          caption="Assets held by this vault"
          columns={columns}
          rows={rows}
          keyOf={(h) => h.address}
          loading={loading}
          loadingRows={2}
          empty={
            <EmptyState
              className="!px-0"
              title="Nothing accumulated yet"
              detail="Holdings appear here after the first cycle settles. Whatever lands here is withdrawable by address — the vault can always return what it bought."
            />
          }
        />
      </div>
    </section>
  );
}
