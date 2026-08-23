"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Side sheet on desktop, bottom sheet on mobile.
 *
 * Uses the native `<dialog>` element, which gives focus trapping, inertness of
 * the page behind, and Escape-to-close from the platform instead of from three
 * hand-rolled effects that each have a bug in them.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop closes. The dialog element reports backdrop
        // clicks as clicks on itself, so compare the target.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-hi backdrop:bg-black/70 backdrop:backdrop-blur-[2px]",
        "h-dvh w-dvw"
      )}
    >
      <div className="flex h-full w-full items-end justify-center sm:items-stretch sm:justify-end">
        <div
          className={cn(
            "flex max-h-[92dvh] w-full flex-col bg-surface ring-1 ring-rule sm:max-h-none sm:h-full",
            width === "lg" ? "sm:w-[560px]" : "sm:w-[440px]"
          )}
        >
          <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-7 items-center justify-center text-low transition-colors hover:text-hi"
            >
              <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

          {footer ? <footer className="border-t border-hairline px-5 py-4">{footer}</footer> : null}
        </div>
      </div>
    </dialog>
  );
}
