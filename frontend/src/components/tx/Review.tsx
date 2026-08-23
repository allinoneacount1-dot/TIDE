import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The review block shown before any signature.
 *
 * Every blockchain action in TIDE states the same set of facts before the wallet
 * opens: which network, which contract, what amount, what comes back, what the
 * guard is, and what it costs. It is one component so that set cannot quietly
 * differ between a deposit and an execution.
 */
export function Review({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("divide-y divide-hairline border-y border-hairline", className)}>{children}</dl>
  );
}

export function ReviewRow({
  term,
  children,
  tone = "default",
  mono = true,
  hint,
}: {
  term: string;
  children: ReactNode;
  tone?: "default" | "signal" | "warn" | "fail" | "muted";
  mono?: boolean;
  hint?: string;
}) {
  const tones = {
    default: "text-hi",
    signal: "text-signal",
    warn: "text-warn",
    fail: "text-fail",
    muted: "text-low",
  } as const;

  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="t-eyebrow shrink-0 pt-0.5" title={hint}>
        {term}
      </dt>
      <dd className={cn("min-w-0 text-right text-[13px]", mono && "t-num", tones[tone])}>{children}</dd>
    </div>
  );
}
