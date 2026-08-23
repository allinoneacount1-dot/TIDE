"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Hash } from "viem";
import { TX_PHASE, TX_RAIL, type TxPhase } from "@/lib/lifecycle";
import { explorerTxUrl } from "@/lib/chains";
import { shortHash } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusDot } from "@/components/primitives/StatusDot";
import { CopyButton } from "@/components/primitives/CopyButton";

export type TrackedTx = {
  id: string;
  label: string;
  phase: TxPhase;
  hash: Hash | null;
  error: string | null;
  chainId: number;
  startedAt: number;
};

type TxContextValue = {
  track: (tx: Omit<TrackedTx, "id" | "startedAt">) => string;
  update: (id: string, patch: Partial<TrackedTx>) => void;
  dismiss: (id: string) => void;
  items: TrackedTx[];
};

const TxContext = createContext<TxContextValue | null>(null);

export function useTxTracker() {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTxTracker must be used inside TxProvider");
  return ctx;
}

/**
 * Session-wide transaction tracker.
 *
 * Every blockchain action registers here, so the progress rail is in one fixed
 * place rather than inline next to whichever button was pressed. That matters
 * on this product specifically: a deposit takes a few seconds and the user is
 * likely to navigate to the plan editor while it settles. An inline spinner
 * would unmount and the user would lose the thread.
 */
export function TxProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TrackedTx[]>([]);

  const track = useCallback((tx: Omit<TrackedTx, "id" | "startedAt">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [{ ...tx, id, startedAt: Date.now() }, ...prev].slice(0, 6));
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<TrackedTx>) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  /**
   * Successful transactions retire themselves.
   *
   * A confirmed card has done its job — the state it produced is now visible in
   * the interface behind it. Left up, four of them stack into a column that
   * covers a third of the screen and blocks the controls the user needs next.
   * Failures never auto-dismiss: those the user has to read and act on.
   */
  useEffect(() => {
    const settled = items.filter((t) => t.phase === "confirmed" || t.phase === "rejected");
    if (settled.length === 0) return;

    const timers = settled.map((t) =>
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 7_000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [items]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ track, update, dismiss, items }), [track, update, dismiss, items]);

  return (
    <TxContext.Provider value={value}>
      {children}
      <TxTracker items={items} onDismiss={dismiss} />
    </TxContext.Provider>
  );
}

function TxTracker({ items, onDismiss }: { items: TrackedTx[]; onDismiss: (id: string) => void }) {
  const visible = items.filter((t) => t.phase !== "idle");
  if (!visible.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col-reverse gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]"
      aria-live="polite"
    >
      {visible.map((tx) => (
        <TxCard key={tx.id} tx={tx} onDismiss={() => onDismiss(tx.id)} />
      ))}
    </div>
  );
}

function TxCard({ tx, onDismiss }: { tx: TrackedTx; onDismiss: () => void }) {
  const meta = TX_PHASE[tx.phase];
  const railIndex = TX_RAIL.indexOf(tx.phase);
  const failed = tx.phase === "reverted" || tx.phase === "rpc-error";
  const url = tx.hash ? explorerTxUrl(tx.chainId, tx.hash) : undefined;

  const dot =
    meta.tone === "success"
      ? "live"
      : meta.tone === "error"
        ? "error"
        : meta.tone === "warn"
          ? "attention"
          : meta.tone === "progress"
            ? "pending"
            : "idle";

  return (
    <div className="pointer-events-auto chamfer chamfer-edge bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <StatusDot state={dot} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-hi">{tx.label}</p>
          <p className={cn("mt-0.5 text-[12px] leading-[1.45]", failed ? "text-fail" : "text-low")}>
            {tx.error ?? (meta.detail || meta.label)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 inline-flex size-6 shrink-0 items-center justify-center text-dim transition-colors hover:text-hi"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* The rail. Submitted and Confirmed are separate steps because they are
          separate facts — nothing here calls a broadcast a success. */}
      {railIndex >= 0 ? (
        <div className="mt-3 flex gap-px px-4">
          {TX_RAIL.map((phase, i) => (
            <div key={phase} className="flex-1">
              <div className={cn("h-[2px]", i <= railIndex ? "bg-signal" : "bg-rule")} />
              <p
                className={cn(
                  "mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em]",
                  i === railIndex ? "text-signal" : i < railIndex ? "text-low" : "text-dim"
                )}
              >
                {TX_PHASE[phase].label.split(" ")[0]}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {tx.hash ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline px-4 py-2.5">
          <span className="t-mono text-[11px] text-dim">{shortHash(tx.hash)}</span>
          <div className="flex items-center gap-1">
            <CopyButton value={tx.hash} label="Copy transaction hash" />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="t-mono px-1 text-[11px] text-mid underline decoration-rule underline-offset-2 transition-colors hover:text-signal"
              >
                Explorer
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="h-3.5" />
      )}
    </div>
  );
}
