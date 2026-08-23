"use client";

import { cn } from "@/lib/cn";

/**
 * Segmented control. Real radio semantics, so arrow keys move between options
 * and screen readers announce the group — a row of styled buttons gives you
 * neither.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("chamfer-sm inline-flex bg-raised p-0.5 ring-1 ring-inset ring-rule", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              "chamfer-sm relative flex-1 whitespace-nowrap px-3 font-medium transition-colors duration-[140ms]",
              size === "sm" ? "h-7 text-[11px]" : "h-9 text-[12px]",
              active ? "bg-signal text-signal-ink" : "text-low hover:text-hi"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
