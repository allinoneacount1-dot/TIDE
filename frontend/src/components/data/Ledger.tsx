"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The ledger: a real table for real records.
 *
 * Execution history is tabular data with a fixed schema and a natural sort, so
 * it gets a `<table>` — with scoped headers, tabular numerals, and right
 * alignment on every numeric column so digits line up by place value. A list of
 * cards cannot be scanned down a column, cannot be sorted, and is not announced
 * as a grid by a screen reader.
 *
 * On narrow screens the table scrolls inside its own container rather than
 * collapsing into stacked cards: someone comparing execution prices needs the
 * column, and a horizontal scroll preserves it.
 */

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Right-align and use mono. True for anything numeric. */
  numeric?: boolean;
  width?: string;
  cell: (row: T, index: number) => ReactNode;
  /** Hidden below lg. For columns that are context, not content. */
  secondary?: boolean;
};

export function Ledger<T>({
  columns,
  rows,
  keyOf,
  empty,
  loading,
  loadingRows = 5,
  onRowClick,
  className,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T, index: number) => string;
  empty?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  caption?: string;
}) {
  if (!loading && rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "t-eyebrow whitespace-nowrap px-4 pb-2.5 pt-0 font-medium",
                  c.numeric && "text-right",
                  c.secondary && "hidden lg:table-cell"
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i} className="border-b border-hairline/60">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3", c.secondary && "hidden lg:table-cell")}>
                      <div className={cn("skeleton h-3.5", c.numeric ? "ml-auto w-16" : "w-24")} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, i) => (
                <tr
                  key={keyOf(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-hairline/60 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-raised"
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3 align-middle text-[13px]",
                        c.numeric ? "t-num text-right" : "text-mid",
                        c.secondary && "hidden lg:table-cell"
                      )}
                    >
                      {c.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Empty state.
 *
 * Says what would put something here, and offers the action that does it. An
 * empty state that only says "No data" makes the user reverse-engineer the
 * product's causality on their own.
 */
export function EmptyState({
  title,
  detail,
  action,
  className,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-4 py-10 md:px-5", className)}>
      <div className="h-px w-10 bg-signal" />
      <div className="max-w-[46ch] space-y-1.5">
        <p className="text-[14px] font-medium text-hi">{title}</p>
        <p className="text-[13px] leading-5 text-low">{detail}</p>
      </div>
      {action}
    </div>
  );
}
