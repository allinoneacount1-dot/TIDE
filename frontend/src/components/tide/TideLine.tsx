import { cn } from "@/lib/cn";

/**
 * THE TIDE LINE — TIDE's signature mark.
 *
 * A hairline carrying a travelling highlight. It is the one visual device that
 * repeats everywhere in the product: under the active nav item, along the
 * execution spine, across section seams, beneath a live figure. The intent is
 * that with the logo removed you could still tell this was TIDE.
 *
 * It is never decorative. The line is only "live" when something behind it is
 * actually live — an armed plan, a pending transaction, a fresh oracle. A page
 * of rules is not a page of animation.
 */
export function TideLine({
  live = false,
  className,
  orientation = "horizontal",
}: {
  /** Only true when the thing this line annotates is genuinely active. */
  live?: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <span
        aria-hidden="true"
        data-live={live}
        className={cn("relative block w-px bg-rule", live && "bg-signal-edge", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-live={live}
      className={cn("tide-line block w-full", className)}
    />
  );
}
