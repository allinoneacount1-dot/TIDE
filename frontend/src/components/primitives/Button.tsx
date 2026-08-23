"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  // The signal colour is a *background* only for the single most important
  // action on a screen. Used more widely it stops meaning "act here".
  primary:
    "bg-signal text-signal-ink hover:bg-[#e0ff3d] active:bg-[#c2e800] disabled:bg-active disabled:text-dim",
  secondary:
    "bg-raised text-hi hover:bg-hover active:bg-active disabled:text-dim ring-1 ring-inset ring-rule",
  ghost: "bg-transparent text-mid hover:text-hi hover:bg-raised disabled:text-dim",
  danger: "bg-fail-wash text-fail ring-1 ring-inset ring-fail-edge hover:bg-[rgba(255,77,61,0.16)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-6 text-[14px]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    /** Renders a spinner and blocks interaction without changing width. */
    busy?: boolean;
    icon?: ReactNode;
    full?: boolean;
  }
>(function Button(
  { variant = "secondary", size = "md", busy, icon, full, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "chamfer-sm relative inline-flex items-center justify-center gap-2",
        "font-medium tracking-[-0.01em] whitespace-nowrap",
        "transition-colors duration-[140ms]",
        "disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        full && "w-full",
        className
      )}
      {...rest}
    >
      {busy ? <Spinner /> : icon}
      <span className={cn(busy && "opacity-70")}>{children}</span>
    </button>
  );
});

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
