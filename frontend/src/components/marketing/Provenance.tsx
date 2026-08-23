"use client";

import Link from "next/link";
import { getDeployment } from "@/lib/config";
import { DEFAULT_CHAIN_ID, getChain, explorerAddressUrl } from "@/lib/chains";
import { shortAddress } from "@/lib/format";
import { Tag } from "@/components/primitives/Tag";
import { TideLine } from "@/components/tide/TideLine";
import { Button } from "@/components/primitives/Button";

/**
 * Deployment provenance, stated on the marketing page.
 *
 * Unusual placement, and the reason is the brief: no simulated activity may be
 * presented as real. TIDE's testnet market is mocks — Robinhood Chain testnet
 * has no official stock tokens, no DEX aggregator and no Chainlink feeds — so
 * the landing page says exactly that, with the addresses, rather than letting a
 * visitor assume they are looking at a live market.
 *
 * Everything here is read from the generated deployment record, so it cannot
 * drift from what was actually deployed.
 */
export function Provenance() {
  const deployment = getDeployment(DEFAULT_CHAIN_ID);
  const chain = getChain(DEFAULT_CHAIN_ID);

  return (
    <section className="border-t border-hairline py-20 md:py-28">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="t-eyebrow">Status</p>
          <h2 className="t-display mt-3 text-[clamp(1.6rem,3.4vw,2.5rem)]">
            Where TIDE is running, right now.
          </h2>
          <TideLine live={Boolean(deployment)} className="mt-6 max-w-[180px]" />
        </div>

        <div className="md:col-span-6 md:col-start-7">
          {deployment ? (
            <dl className="space-y-px">
              <Row term="Network">
                <span className="text-hi">{chain?.name}</span>
                <span className="t-mono ml-2 text-dim">ID {deployment.chainId}</span>
              </Row>
              <Row term="Registry">
                {explorerAddressUrl(deployment.chainId, deployment.registry) ? (
                  <a
                    href={explorerAddressUrl(deployment.chainId, deployment.registry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="t-mono inline-flex min-h-6 items-center underline decoration-rule underline-offset-2 text-mid transition-colors hover:text-signal"
                  >
                    {shortAddress(deployment.registry, 10, 8)}
                  </a>
                ) : (
                  <span className="t-mono text-mid">{shortAddress(deployment.registry, 10, 8)}</span>
                )}
              </Row>
              <Row term="Market">
                {deployment.simulated ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Tag tone="warn">Simulated</Tag>
                    <span className="text-low">Mock assets and router published by TIDE</span>
                  </span>
                ) : (
                  <span className="flex flex-wrap items-center gap-2">
                    <Tag tone="signal">Live</Tag>
                    <span className="text-low">Uniswap v3 · Chainlink feeds · USDG</span>
                  </span>
                )}
              </Row>
            </dl>
          ) : (
            <p className="text-[14px] leading-[1.6] text-mid">
              No registry is configured for {chain?.name ?? "this network"} in this build. The
              interface will read and write nothing until one is deployed and its address is set.
            </p>
          )}

          {deployment?.simulated ? (
            <div className="mt-6 flex gap-3 py-1">
              <div className="w-[2px] shrink-0 self-stretch bg-warn" />
              <p className="max-w-[58ch] text-[12.5px] leading-[1.55] text-mid">
                Robinhood Chain testnet has no official stock tokens, no DEX aggregator and no
                Chainlink feeds. To exercise the full loop there, TIDE deploys its own mock assets,
                router and price feeds. They behave like the real market but they are not one — and
                every screen that shows them says so.
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app">
              <Button variant="primary">Launch TIDE</Button>
            </Link>
            <Link href="/docs">
              <Button variant="secondary">Read the docs</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="t-eyebrow sm:w-28 sm:shrink-0">{term}</dt>
      <dd className="min-w-0 text-[13.5px] text-mid">{children}</dd>
    </div>
  );
}
