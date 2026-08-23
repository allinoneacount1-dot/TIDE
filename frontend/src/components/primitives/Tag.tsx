import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "signal" | "warn" | "fail" | "outline";

const TONE: Record<Tone, string> = {
  neutral: "bg-raised text-mid",
  signal: "bg-signal-wash text-signal ring-1 ring-inset ring-signal-edge",
  warn: "bg-warn-wash text-warn ring-1 ring-inset ring-warn-edge",
  fail: "bg-fail-wash text-fail ring-1 ring-inset ring-fail-edge",
  outline: "bg-transparent text-low ring-1 ring-inset ring-rule",
};

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-[3px]",
        "font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
