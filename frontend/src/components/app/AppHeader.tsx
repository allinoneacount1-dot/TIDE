"use client";

import Link from "next/link";
import type { Address } from "viem";
import { Wordmark } from "@/components/identity/Wordmark";
import { AccountChip } from "@/components/wallet/AccountChip";
import { Button } from "@/components/primitives/Button";
import { StatusDot } from "@/components/primitives/StatusDot";
import { Tag } from "@/components/primitives/Tag";
import { shortAddress } from "@/lib/format";
import { getChain } from "@/lib/chains";
import { cn } from "@/lib/cn";

/**
 * Application header.
 *
 * Carries three facts that must never be more than a glance away: which vault
 * you are operating, which network you are on, and whether that network's market
 * is real. The previous build hard-coded "ROBINHOOD L2 • 31337" here — a chain
 * ID that appeared nowhere else in the codebase — which is exactly the class of
 * error a live readout prevents.
 */
export function AppHeader({
  vaults,
  active,
  onSelect,
  onCreate,
  creating,
  chainId,
  simulated,
}: {
  vaults: Address[];
  active: Address | undefined;
  onSelect: (v: Address) => void;
  /** Deploy an additional vault. Absent on the pre-connect shells. */
  onCreate?: () => void;
  creating?: boolean;
  chainId: number | undefined;
  simulated: boolean;
}) {
  const chain = getChain(chainId);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ground/90 backdrop-blur-[10px]">
      <div className="shell flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="TIDE home" className="flex min-h-6 shrink-0 items-center py-1">
            <Wordmark className="h-[18px] w-auto text-hi" />
          </Link>

          {vaults.length > 0 ? (
            // Visible at every width. Hiding the vault switcher on small screens
            // makes a multi-vault account unusable on a phone, which is where a
            // recurring-investing product is most often checked.
            <div className="flex min-w-0 items-center gap-2 border-l border-rule pl-3">
              <label htmlFor="vault-switch" className="t-eyebrow hidden shrink-0 sm:block">
                Vault
              </label>
              <select
                id="vault-switch"
                value={active ?? ""}
                onChange={(e) => onSelect(e.target.value as Address)}
                className={cn(
                  "chamfer-sm h-7 max-w-[140px] truncate bg-raised px-2 font-mono text-[11px] text-hi sm:max-w-[190px] sm:text-[12px]",
                  "ring-1 ring-inset ring-rule outline-none transition-colors focus:ring-signal-edge"
                )}
              >
                {vaults.map((v, i) => (
                  <option key={v} value={v}>
                    {String(i + 1).padStart(2, "0")} · {shortAddress(v, 6, 4)}
                  </option>
                ))}
              </select>

              {/* A user can own any number of vaults — the registry indexes them
                  per address and the switcher above lists them. Without this
                  there was no way to create the second one. */}
              {onCreate ? (
                <Button
                  size="sm"
                  variant="ghost"
                  busy={creating}
                  onClick={onCreate}
                  title="Deploy an additional vault"
                >
                  New vault
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          {simulated ? (
            <Tag tone="warn" className="hidden md:inline-flex">
              Simulated market
            </Tag>
          ) : null}
          <span className="hidden items-center gap-2 md:flex">
            <StatusDot state={chain ? "live" : "error"} />
            <span className="t-mono text-[11px] text-mid">{chain?.name ?? `Chain ${chainId ?? "?"}`}</span>
          </span>
          <AccountChip />
        </div>
      </div>
    </header>
  );
}
