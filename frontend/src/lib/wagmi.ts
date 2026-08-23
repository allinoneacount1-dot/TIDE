import { createConfig, http, fallback, cookieStorage, createStorage } from "wagmi";
import { injected, walletConnect, mock } from "wagmi/connectors";
import { robinhood, robinhoodTestnet, tideDevnet } from "./chains";

/**
 * Wallet stack.
 *
 * RainbowKit was removed because it shipped its own visual language into the
 * middle of the product and pinned an old wagmi. TIDE renders its own connect
 * surface over these connectors directly.
 *
 * The Coinbase Wallet connector is deliberately absent. It pulls @base-org/account
 * → @coinbase/cdp-sdk, which imports `@x402/*` subpaths that do not resolve —
 * this is what the previous build was papering over with five webpack aliases in
 * next.config. Nothing is lost by dropping it: wagmi's EIP-6963 discovery is on
 * by default, so the Coinbase extension (and every other installed wallet)
 * appears as its own connector, and mobile Coinbase Wallet connects over
 * WalletConnect.
 */

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * End-to-end mode.
 *
 * When NEXT_PUBLIC_E2E is set, a mock connector bound to a known devnet account
 * is registered *first*, so Playwright can drive the app without a browser
 * extension. Everything downstream stays real: real contracts, real signatures
 * from that account, real transactions on the devnet. Only the wallet chooser is
 * bypassed.
 *
 * The flag is read at module scope from a NEXT_PUBLIC_ variable, so it is
 * inlined at build time — a production build with the flag unset cannot reach
 * this branch at all.
 */
const e2eAccount = process.env.NEXT_PUBLIC_E2E_ACCOUNT as `0x${string}` | undefined;

const connectors = [
  ...(process.env.NEXT_PUBLIC_E2E === "1" && e2eAccount
    ? [mock({ accounts: [e2eAccount], features: { reconnect: true } })]
    : []),
  injected({ shimDisconnect: true }),
  // Only registered when a project id exists. An unconfigured WalletConnect
  // renders a connector that fails on click, which is worse than absent.
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          metadata: {
            name: "TIDE",
            description: "Recurring execution for tokenized equities on Robinhood Chain.",
            url: process.env.NEXT_PUBLIC_APP_URL || "https://tide.exchange",
            icons: ["/mark.svg"],
          },
          showQrModal: true,
        }),
      ]
    : []),
];

/** Public RPCs are rate-limited; a private endpoint is tried first when set. */
function transportFor(publicUrl: string, privateUrl?: string) {
  const batch = { batch: { wait: 16 } } as const;
  return privateUrl
    ? fallback([http(privateUrl, batch), http(publicUrl, batch)])
    : http(publicUrl, batch);
}

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhood, tideDevnet],
  connectors,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [robinhood.id]: transportFor(
      "https://rpc.mainnet.chain.robinhood.com",
      process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL
    ),
    [robinhoodTestnet.id]: transportFor(
      "https://rpc.testnet.chain.robinhood.com",
      process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL
    ),
    [tideDevnet.id]: http(process.env.NEXT_PUBLIC_DEVNET_RPC_URL || "http://127.0.0.1:8545"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
