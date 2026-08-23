"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { TxProvider } from "@/components/tx/TxProvider";

/**
 * Wallet + data providers, scoped to the application routes.
 */
export function Web3Providers({ children }: { children: ReactNode }) {
  // One client per browser session, created inside state so React strict mode
  // does not hand two different clients to two different renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Refetching on every window focus hammers a rate-limited public
            // RPC for no benefit; individual hooks set their own polling
            // interval according to how volatile the value actually is.
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
            staleTime: 30_000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <TxProvider>{children}</TxProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
