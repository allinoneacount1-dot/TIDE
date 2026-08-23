import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { TideLine } from "@/components/tide/TideLine";
import { getDeployment } from "@/lib/config";
import { DEFAULT_CHAIN_ID, getChain } from "@/lib/chains";
import { PROTOCOL } from "@/lib/config";
import { formatBps } from "@/lib/format";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How TIDE executes recurring investments on Robinhood Chain: the contracts, the guards, the data sources and the operating limits.",
};

/**
 * Reference page.
 *
 * Written to be checkable rather than persuasive. Where a number appears it is
 * either read from the deployment record at build time or is a compiled-in
 * protocol constant — nothing here is a figure someone typed into a marketing
 * page and forgot to update, which is how the previous docs came to describe a
 * chain ID, a test count and an indexer that did not exist.
 */
export default function DocsPage() {
  const deployment = getDeployment(DEFAULT_CHAIN_ID);
  const chain = getChain(DEFAULT_CHAIN_ID);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="shell pt-12 md:pt-20">
          <div className="h-px w-full bg-signal" />
          <p className="t-eyebrow mt-4">Documentation</p>
          <h1 className="t-display mt-3 max-w-[18ch] text-[clamp(2rem,5vw,3.5rem)]">
            How a cycle actually settles.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.65] text-mid">
            TIDE is a recurring execution protocol for tokenized equities on Robinhood Chain. This
            page covers the parts you would want to verify before depositing: what the contracts do,
            what guards an execution, where the data comes from, and what the operating limits are.
          </p>
        </section>

        <Section id="model" eyebrow="01" title="The model">
          <P>
            A <Term>vault</Term> is a contract you own. It holds quote capital and nothing else can
            move it. A <Term>plan</Term> is an instruction inside that vault: buy this asset, this
            much, this often, never above this price. A <Term>keeper</Term> is an address permitted
            to trigger a plan when its window opens — and permitted to do nothing else.
          </P>
          <P>
            Vaults are EIP-1167 minimal proxies deployed by the registry, so creating one costs a
            fraction of a full deployment. The implementation is immutable and unowned; there is no
            proxy admin and no upgrade path.
          </P>
        </Section>

        <Section id="guards" eyebrow="02" title="What guards an execution">
          <P>
            Every execution must clear a floor computed on chain, and the floor is the tighter of
            two independent constraints:
          </P>
          <Dl
            items={[
              [
                "Your limit price",
                "The highest price you are willing to pay, stored on the plan. Nobody but you can change it.",
              ],
              [
                "The oracle band",
                "The registry's Chainlink feed for that asset, less your slippage tolerance. Chainlink is Robinhood Chain's official oracle; Pyth is not deployed there.",
              ],
            ]}
          />
          <P>
            The keeper supplies its own <Term>minOut</Term> from the live route, but the contract
            takes <em className="text-hi not-italic">whichever floor is higher</em>. A keeper passing
            zero cannot execute below your guard. A plan with neither a limit price nor a feed is
            never executable at all — it reports <Term>Unguarded</Term> rather than trading blind.
          </P>
          <P>
            Output is measured as the vault&rsquo;s own balance delta before and after the swap, so a
            router that reports one number and delivers another is caught by arithmetic rather than
            by trust.
          </P>
        </Section>

        <Section id="limits" eyebrow="03" title="Limits, in the contract">
          <Dl
            items={[
              ["Protocol fee ceiling", `${formatBps(PROTOCOL.maxFeeBps)} — a compiled-in constant, not a governance parameter`],
              ["Maximum slippage tolerance", formatBps(PROTOCOL.maxSlippageBps)],
              ["Interval range", "1 hour to 1 year"],
              ["Withdrawal", "Never blocked — not by a vault pause, not by a protocol halt, not by a dead oracle"],
              ["Ownership transfer", "Two-step, so a mistyped address cannot orphan a vault"],
            ]}
          />
        </Section>

        <Section id="oracle" eyebrow="04" title="Why nothing executes at the weekend">
          <P>
            Chainlink&rsquo;s tokenized-equity feeds run <Term>us_equities_24/5</Term> with a 24-hour
            heartbeat. Outside market hours the last answer ages, and once it passes the registry&rsquo;s
            freshness window the vault reports <Term>Awaiting market</Term> and refuses to execute.
          </P>
          <P>
            This is deliberate rather than a limitation. On-chain liquidity for an equity is thinnest
            exactly when the underlying market is shut, which is when a scheduled buy would fill
            worst. Waiting for the open is the correct behaviour, and the cadence is preserved: the
            window stays open until the execution happens.
          </P>
        </Section>

        <Section id="data" eyebrow="05" title="Where the data comes from">
          <Dl
            items={[
              ["Balances, plans, readiness", "Direct contract reads over JSON-RPC. No intermediary."],
              ["Execution history", "Blockscout's indexed log API, with a bounded eth_getLogs fallback. The interface states which one answered."],
              ["Reference price", "The same Chainlink aggregator the on-chain guard consults — so the price on screen is the price enforcing the trade."],
              ["Swap routes", "0x Swap API v2 on mainnet. Testnet has no aggregator at all, so a simulated router is used and labelled."],
            ]}
          />
          <P>
            Robinhood Chain produces a block roughly every 100ms. A naïve month-long{" "}
            <Term>eth_getLogs</Term> scan would be tens of millions of blocks, which is why history
            comes from an indexer and the RPC fallback is explicitly bounded and says so.
          </P>
        </Section>

        <Section id="automation" eyebrow="06" title="Automation">
          <P>
            Neither Chainlink Automation nor Gelato supports Robinhood Chain. There is no managed
            keeper available for this network, so TIDE ships its own — a stateless script in{" "}
            <Term>/keeper</Term> that can run from GitHub Actions, a small VPS, or your own machine.
          </P>
          <P>
            You can also execute by hand from the terminal at any time. The contract permits the
            vault owner to call <Term>execute</Term> directly, which matters on a chain where the
            only automation is one you run yourself.
          </P>
        </Section>

        <Section id="deployment" eyebrow="07" title="This deployment">
          {deployment ? (
            <Dl
              items={[
                ["Network", `${chain?.name} · chain ${deployment.chainId}`],
                ["Registry", deployment.registry],
                ["Quote asset", deployment.quote],
                [
                  "Market",
                  deployment.simulated
                    ? "Simulated — mock assets, router and feeds published by TIDE's own deploy script"
                    : "Live — Uniswap v3, Chainlink feeds, USDG",
                ],
              ]}
            />
          ) : (
            <P>
              No registry is configured for {chain?.name ?? "this network"} in this build.
            </P>
          )}
          <p className="mt-6">
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center text-[14px] text-signal underline decoration-signal-edge underline-offset-4"
            >
              Open the terminal →
            </Link>
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="shell scroll-mt-20 border-t border-hairline py-10 md:py-14">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="t-mono text-[13px] text-signal">{eyebrow}</p>
          <h2 className="t-display mt-2 text-[clamp(1.35rem,2.6vw,1.9rem)]">{title}</h2>
          <TideLine className="mt-4 max-w-[90px]" />
        </div>
        <div className="space-y-4 md:col-span-7 md:col-start-6">{children}</div>
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[68ch] text-[14px] leading-[1.7] text-mid">{children}</p>;
}

function Term({ children }: { children: React.ReactNode }) {
  return <code className="t-mono text-[13px] text-hi">{children}</code>;
}

function Dl({ items }: { items: [string, string][] }) {
  return (
    <dl className="border-t border-hairline">
      {items.map(([term, detail]) => (
        <div key={term} className="grid gap-1 border-b border-hairline py-3 sm:grid-cols-5 sm:gap-4">
          <dt className="t-eyebrow sm:col-span-2 sm:pt-0.5">{term}</dt>
          <dd className="t-mono break-all text-[13px] leading-[1.6] text-mid sm:col-span-3">
            {detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
