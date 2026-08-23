import { cn } from "@/lib/cn";

export type DotState = "live" | "armed" | "pending" | "attention" | "error" | "idle";

const STATE: Record<DotState, { colour: string; pulse: boolean }> = {
  live: { colour: "bg-signal", pulse: true },
  armed: { colour: "bg-signal", pulse: false },
  pending: { colour: "bg-warn", pulse: true },
  attention: { colour: "bg-warn", pulse: false },
  error: { colour: "bg-fail", pulse: false },
  idle: { colour: "bg-dim", pulse: false },
};

/**
 * Status is carried by three things at once — colour, motion and the adjacent
 * label — so it never depends on colour alone. That is the accessibility floor,
 * and it is also just clearer.
 */
export function StatusDot({ state, className }: { state: DotState; className?: string }) {
  const s = STATE[state];
  return (
    <span className={cn("relative inline-flex size-1.5 shrink-0", className)}>
      {s.pulse ? (
        <span
          className={cn("absolute inset-0 animate-ping rounded-full opacity-60", s.colour)}
          style={{ animationDuration: "2.4s" }}
        />
      ) : null}
      <span className={cn("relative size-1.5 rounded-full", s.colour)} />
    </span>
  );
}
