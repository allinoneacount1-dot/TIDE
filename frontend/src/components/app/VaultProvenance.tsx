"use client";

import type { Address } from "viem";
import { Tag } from "@/components/primitives/Tag";
import { CopyButton } from "@/components/primitives/CopyButton";
import { Button } from "@/components/primitives/Button";
import { explorerAddressUrl } from "@/lib/chains";
import { formatBps, shortAddress } from "@/lib/format";
import type { Deployment } from "@/lib/config";

/**
 * PROVENANCE — every address this session is trusting, in one place.
 *
 * Included because the brief asks for transaction provenance and because a
 * non-custodial product should make its own trust surface inspectable rather
 * than asking to be taken on faith. Anyone can click through to the explorer and
 * verify the vault they are using is a clone of the implementation the registry
 * declares.
 */
export function VaultProvenance({
  vault,
  owner,
  keeper,
  quoteAddress,
  deployment,
  protocol,
  paused,
  chainId,
  onPauseToggle,
  pauseBusy,
}: {
  vault: Address;
  owner: Address | undefined;
  keeper: Address | undefined;
  quoteAddress: Address | undefined;
  deployment: Deployment;
  protocol:
    | { feeBps: number; maxFeeBps: number; treasury: Address; maxOracleAge: number; executionsHalted: boolean }
    | undefined;
  paused: boolean | undefined;
  chainId: number;
  onPauseToggle: () => void;
  pauseBusy: boolean;
}) {
  const rows: { term: string; value: Address | undefined; note?: string }[] = [
    { term: "Vault", value: vault, note: "Holds your capital. Only you can withdraw." },
    { term: "Owner", value: owner, note: "The only address that can move value out." },
    { term: "Keeper", value: keeper, note: "May trigger execution. Nothing else." },
    { term: "Registry", value: deployment.registry, note: "Router allowlist, feeds, fee." },
    { term: "Quote asset", value: quoteAddress },
    { term: "Router", value: deployment.router, note: "Allowlisted venue for swaps." },
  ];

  return (
    <section aria-label="Provenance" className="border-b border-hairline">
      <div className="shell py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-eyebrow">Provenance</h2>
          <div className="flex items-center gap-2">
            {deployment.simulated ? <Tag tone="warn">Simulated market</Tag> : <Tag tone="signal">Live market</Tag>}
            {protocol?.executionsHalted ? <Tag tone="fail">Protocol halted</Tag> : null}
            {paused ? <Tag tone="warn">Vault paused</Tag> : null}
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-px lg:grid-cols-2">
          {rows.map((row) => {
            const url = row.value ? explorerAddressUrl(chainId, row.value) : undefined;
            return (
              <div
                key={row.term}
                className="flex items-start justify-between gap-4 border-b border-hairline py-2.5"
              >
                <div className="min-w-0">
                  <p className="t-eyebrow">{row.term}</p>
                  {row.note ? <p className="mt-0.5 text-[11.5px] text-dim">{row.note}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {row.value ? (
                    <>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="t-mono text-[12px] text-mid underline decoration-rule underline-offset-2 transition-colors hover:text-signal"
                        >
                          {shortAddress(row.value)}
                        </a>
                      ) : (
                        <span className="t-mono text-[12px] text-mid">{shortAddress(row.value)}</span>
                      )}
                      <CopyButton value={row.value} label={`Copy ${row.term} address`} />
                    </>
                  ) : (
                    <span className="t-mono text-[12px] text-dim">not set</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="t-eyebrow">Fee</dt>
              <dd className="t-num mt-0.5 text-[13px] text-hi">
                {protocol ? formatBps(protocol.feeBps) : "—"}
                <span className="ml-1.5 text-[11px] text-dim">
                  ceiling {protocol ? formatBps(protocol.maxFeeBps) : "—"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="t-eyebrow">Oracle window</dt>
              <dd className="t-num mt-0.5 text-[13px] text-hi">
                {protocol ? `${Math.round(protocol.maxOracleAge / 3600)}h` : "—"}
              </dd>
            </div>
          </dl>

          <Button size="sm" variant={paused ? "primary" : "ghost"} busy={pauseBusy} onClick={onPauseToggle}>
            {paused ? "Unpause vault" : "Pause vault"}
          </Button>
        </div>
      </div>
    </section>
  );
}
