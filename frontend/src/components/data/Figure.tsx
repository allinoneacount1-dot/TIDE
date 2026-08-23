import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/primitives/Skeleton";

/**
 * A number, presented typographically rather than in a card.
 *
 * The dashboard brief was explicit: not everything is a card. A figure is a
 * label, a value and an optional note stacked on a baseline grid, separated
 * from its neighbours by rules and space. Wrapping each one in a bordered box
 * triples the ink for no added meaning and is the single clearest tell of a
 * generated dashboard.
 */
export function Figure({
  label,
  value,
  note,
  tone = "default",
  size = "md",
  loading,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "signal" | "warn" | "fail" | "muted";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
}) {
  const tones = {
    default: "text-hi",
    signal: "text-signal",
    warn: "text-warn",
    fail: "text-fail",
    muted: "text-low",
  } as const;

  const sizes = {
    sm: "text-[15px]",
    md: "text-[22px]",
    lg: "text-[34px] md:text-[42px]",
  } as const;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="t-eyebrow">{label}</div>
      {loading ? (
        <Skeleton
          className={cn("mt-1.5", size === "lg" ? "h-9 w-40" : size === "md" ? "h-6 w-24" : "h-4 w-16")}
        />
      ) : (
        <div className={cn("t-num mt-1 truncate leading-none", sizes[size], tones[tone])}>{value}</div>
      )}
      {note ? <div className="t-mono mt-1.5 truncate text-[11px] text-dim">{note}</div> : null}
    </div>
  );
}

/** Figures on a shared rule, which is how a terminal groups related numbers. */
export function FigureRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px bg-hairline",
        "[&>*]:bg-ground [&>*]:px-4 [&>*]:py-4 md:[&>*]:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}
