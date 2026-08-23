"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Copy-to-clipboard with in-place confirmation.
 *
 * The confirmation replaces the icon rather than firing a toast: a toast for
 * "copied" is noise, and on a page that already uses toasts for transaction
 * state it dilutes the ones that matter.
 */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      aria-label={done ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          // Clipboard is permission-gated and blocked in some embedded contexts.
          // Failing silently is right: there is nothing the user can do, and the
          // value is already visible on screen to select manually.
        }
      }}
      className={cn(
        "inline-flex size-6 items-center justify-center text-dim transition-colors hover:text-hi",
        className
      )}
    >
      {done ? (
        <svg viewBox="0 0 14 14" className="size-3 text-signal" fill="none" aria-hidden="true">
          <path d="M2 7.5 5.2 11 12 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" className="size-3" fill="none" aria-hidden="true">
          <rect x="4.6" y="1.4" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.4 12.6h-8v-8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </button>
  );
}
