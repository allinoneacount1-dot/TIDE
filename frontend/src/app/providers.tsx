"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion";

/**
 * Root providers.
 *
 * Deliberately thin. Only motion lives here, because only motion is needed on
 * every route. The wallet stack — wagmi, viem, the connectors, TanStack Query —
 * is mounted in the /app route group instead (see app/(app)/providers.tsx).
 *
 * That split is worth real bytes: the marketing pages have no wallet
 * interaction, and bundling ~60KB of connector code into a page whose job is to
 * explain the product is exactly the kind of thing that makes a landing page
 * feel heavy on a phone.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
