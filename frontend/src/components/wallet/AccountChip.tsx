"use client";

import { useState } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { Drawer } from "@/components/primitives/Drawer";
import { Button } from "@/components/primitives/Button";
import { CopyButton } from "@/components/primitives/CopyButton";
import { StatusDot } from "@/components/primitives/StatusDot";
import { ConnectButton } from "./ConnectSheet";
import { shortAddress, formatUnitsExact } from "@/lib/format";
import { explorerAddressUrl, getChain } from "@/lib/chains";

export function AccountChip() {
  const { address, chainId, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId });
  const [open, setOpen] = useState(false);

  if (!isConnected || !address) return <ConnectButton size="sm" />;

  const chain = getChain(chainId);
  const explorer = explorerAddressUrl(chainId, address);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="chamfer-sm inline-flex h-8 items-center gap-2 bg-raised px-2.5 ring-1 ring-inset ring-rule transition-colors hover:bg-hover"
      >
        <StatusDot state="live" />
        <span className="t-mono text-[12px] text-hi">{shortAddress(address, 6, 4)}</span>
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Wallet">
        <div className="space-y-6">
          <div>
            <p className="t-eyebrow">Address</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="t-mono min-w-0 flex-1 break-all text-[13px] text-hi">{address}</span>
              <CopyButton value={address} label="Copy address" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="t-eyebrow">Network</p>
              <p className="mt-1.5 text-[13px] text-hi">{chain?.name ?? `Chain ${chainId}`}</p>
              <p className="t-mono mt-0.5 text-[11px] text-dim">ID {chainId}</p>
            </div>
            <div>
              <p className="t-eyebrow">Gas balance</p>
              <p className="t-num mt-1.5 text-[13px] text-hi">
                {balance ? `${formatUnitsExact(balance.value, balance.decimals, 5)} ${balance.symbol}` : "—"}
              </p>
              <p className="t-mono mt-0.5 text-[11px] text-dim">{connector?.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {explorer ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(explorer, "_blank", "noopener,noreferrer")}
              >
                View on explorer
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
