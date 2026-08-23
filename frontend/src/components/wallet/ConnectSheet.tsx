"use client";

import { useState } from "react";
import { useConnect, type Connector } from "wagmi";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { SignalRail } from "@/components/data/SignalRail";
import { cn } from "@/lib/cn";

/**
 * The connect surface.
 *
 * Built rather than imported. A wallet modal is the first interaction anyone has
 * with the product, and a stock one announces which library you installed before
 * it announces what the product is.
 *
 * The things a stock modal gets right and this keeps: connectors are listed with
 * their real icons where the connector provides one, an in-flight connector is
 * disabled and labelled, and a rejected connection produces a readable message
 * instead of a silent no-op.
 */
export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connectAsync, isPending } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deduplicate: browsers with several injected wallets surface one connector
  // each plus a generic "Injected", which reads as a broken list.
  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  async function pick(connector: Connector) {
    setError(null);
    setPendingId(connector.uid);
    try {
      await connectAsync({ connector });
      onClose();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(
        /rejected|denied/i.test(raw)
          ? "Connection declined in your wallet."
          : raw.slice(0, 160)
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Connect a wallet">
      <div className="space-y-5">
        <p className="text-[13px] leading-[1.55] text-low">
          TIDE never takes custody. Connecting only lets the app read your address and ask your wallet
          to sign the transactions you approve.
        </p>

        <div className="space-y-px">
          {list.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={isPending}
              // Explicit label: the icon fallback renders a letter, which would
              // otherwise be folded into the computed accessible name as
              // "M Mock Connector Connect".
              aria-label={connector.name}
              onClick={() => pick(connector)}
              className={cn(
                "group flex w-full items-center gap-3 bg-raised px-4 py-3.5 text-left transition-colors",
                "hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center bg-surface ring-1 ring-inset ring-rule">
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className="size-4" />
                ) : (
                  <span aria-hidden="true" className="font-mono text-[11px] text-mid">
                    {connector.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-hi">{connector.name}</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim group-hover:text-signal">
                {pendingId === connector.uid ? "Waiting" : "Connect"}
              </span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <SignalRail tone="warn" title="No wallet detected">
            Install a browser wallet, or open this page in your wallet&rsquo;s built-in browser.
          </SignalRail>
        ) : null}

        {error ? (
          <SignalRail tone="fail" title="Could not connect">
            {error}
          </SignalRail>
        ) : null}
      </div>
    </Drawer>
  );
}

export function ConnectButton({
  size = "md",
  full,
  label = "Connect wallet",
}: {
  size?: "sm" | "md" | "lg";
  full?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size={size} full={full} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConnectSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
