"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="t-eyebrow">
          {label}
        </label>
        {hint ? <span className="t-mono text-[11px] text-dim">{hint}</span> : null}
      </div>
      {children}
      {/* aria-live so a validation message that appears after typing is
          announced, not silently painted. */}
      <p
        aria-live="polite"
        className={cn("t-mono text-[11px] leading-4", error ? "text-fail" : "sr-only")}
      >
        {error ?? ""}
      </p>
    </div>
  );
}

/**
 * Amount input.
 *
 * `inputMode="decimal"` gives mobile the numeric keypad with a separator, and
 * the value is kept as a string the whole way — parsing to a number would lose
 * precision on exactly the values that matter.
 */
export function AmountField({
  label,
  value,
  onChange,
  symbol,
  balance,
  onMax,
  error,
  hint,
  disabled,
  autoFocus,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  symbol: string;
  balance?: string;
  onMax?: () => void;
  error?: string | null;
  hint?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div
        className={cn(
          "chamfer-sm flex h-12 items-center bg-raised ring-1 ring-inset transition-colors",
          error ? "ring-fail-edge" : "ring-rule focus-within:ring-signal-edge",
          disabled && "opacity-50"
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            // Accept only well-formed decimal input; silently reject the rest so
            // the caret never jumps and no error flashes for a keystroke.
            if (next === "" || /^\d*\.?\d*$/.test(next)) onChange(next);
          }}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0.00"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          className="t-num h-full min-w-0 flex-1 bg-transparent px-3.5 text-[18px] text-hi outline-none placeholder:text-dim"
        />
        <div className="flex items-center gap-2 pr-2">
          {onMax ? (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled}
              className="chamfer-sm bg-hover px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mid transition-colors hover:text-hi"
            >
              Max
            </button>
          ) : null}
          <span className="t-mono px-1 text-[13px] text-mid">{symbol}</span>
        </div>
      </div>
      {balance !== undefined ? (
        <p className="t-mono text-[11px] text-dim">
          Available <span className="text-mid">{balance}</span> {symbol}
        </p>
      ) : null}
    </Field>
  );
}
