import Link from "next/link";
import { Wordmark } from "@/components/identity/Wordmark";
import { TideLine } from "@/components/tide/TideLine";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline md:mt-32">
      <div className="shell py-10 md:py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark className="h-5 w-auto text-hi" />
            <p className="mt-4 max-w-[38ch] text-[13px] leading-[1.6] text-low">
              Recurring execution for tokenized equities on Robinhood Chain. Non-custodial by
              construction — TIDE never holds your keys and cannot move your assets.
            </p>
            <TideLine className="mt-6 max-w-[220px]" />
          </div>

          <nav className="md:col-span-3" aria-label="Product">
            <p className="t-eyebrow">Product</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li>
                <Link href="/app" className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal">
                  Launch TIDE
                </Link>
              </li>
              <li>
                <Link href="/#mechanism" className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal">
                  How execution works
                </Link>
              </li>
              <li>
                <Link href="/#guarantees" className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal">
                  What the vault will not do
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="md:col-span-4" aria-label="Reference">
            <p className="t-eyebrow">Reference</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li>
                <Link href="/docs" className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://docs.robinhood.com/chain/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal"
                >
                  Robinhood Chain docs
                </a>
              </li>
              <li>
                <a
                  href="https://robinhoodchain.blockscout.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center text-mid transition-colors hover:text-signal"
                >
                  Block explorer
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
            TIDE · Non-custodial · No protocol token
          </p>
          <p className="max-w-[62ch] text-[11px] leading-[1.5] text-dim">
            Nothing here is investment advice. Tokenized equities carry market risk and smart
            contracts carry technical risk. Read the security notes before depositing.
          </p>
        </div>
      </div>
    </footer>
  );
}
