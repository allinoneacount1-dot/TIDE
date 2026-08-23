import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The base surface.
 *
 * One corner is chamfered, echoing the cut terminals in the wordmark. One, not
 * four — four corners reads as costume, one reads as a machined part. A
 * chamfered element cannot carry a CSS border (the clip removes it), so the edge
 * is drawn by `.chamfer-edge`.
 *
 * `flush` exists because the most common mistake with a surface component is
 * padding a table inside it.
 */
export function Panel({
  children,
  className,
  as: Tag = "div",
  tone = "surface",
  flush = false,
  chamfer = true,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  tone?: "surface" | "raised" | "ghost" | "signal" | "warn" | "fail";
  flush?: boolean;
  chamfer?: boolean;
}) {
  const tones = {
    surface: "bg-surface",
    raised: "bg-raised",
    ghost: "bg-transparent",
    signal: "bg-signal-wash",
    warn: "bg-warn-wash",
    fail: "bg-fail-wash",
  } as const;

  return (
    <Tag
      className={cn(
        "relative",
        tones[tone],
        chamfer && "chamfer chamfer-edge",
        !chamfer && "border border-rule",
        !flush && "p-4 md:p-5",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Section header inside a Panel: eyebrow left, meta right, hairline under. */
export function PanelHead({
  title,
  meta,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 pb-3", className)}>
      <h2 className="t-eyebrow text-mid">{title}</h2>
      {meta ? <div className="t-mono text-[11px] text-dim">{meta}</div> : null}
    </div>
  );
}
