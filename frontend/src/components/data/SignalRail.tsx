import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Warnings and notices as a rail, not a box.
 *
 * A coloured bar on the leading edge with the message beside it. Boxed alerts
 * fight the panel system for attention and stack badly; a rail sits inside the
 * reading column and scales from one line to a paragraph without redesigning.
 */
export function SignalRail({
  tone = "warn",
  title,
  children,
  action,
  className,
}: {
  tone?: "signal" | "warn" | "fail" | "neutral";
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    signal: { bar: "bg-signal", text: "text-signal" },
    warn: { bar: "bg-warn", text: "text-warn" },
    fail: { bar: "bg-fail", text: "text-fail" },
    neutral: { bar: "bg-rule-strong", text: "text-mid" },
  } as const;

  return (
    <div role={tone === "fail" ? "alert" : "status"} className={cn("flex gap-3 py-1", className)}>
      <div className={cn("w-[2px] shrink-0 self-stretch", tones[tone].bar)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className={cn("t-eyebrow", tones[tone].text)}>{title}</p> : null}
        <div className="text-[12.5px] leading-[1.5] text-mid">{children}</div>
        {action ? <div className="pt-1.5">{action}</div> : null}
      </div>
    </div>
  );
}
