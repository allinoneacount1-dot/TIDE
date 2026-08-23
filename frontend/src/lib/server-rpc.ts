/**
 * RPC endpoint resolution for server-side route handlers.
 *
 * Route handlers and the browser must agree on which node they are talking to.
 * If they do not, the client reads one chain's state and the server quotes
 * another's — which surfaces as "no route available" against a vault the UI can
 * plainly see, and is miserable to diagnose.
 *
 * So resolution checks the server-only variable first, then falls back to the
 * NEXT_PUBLIC one the browser is using (which is also readable on the server),
 * and only then to the public endpoint. Pointing the app at a devnet with a
 * single NEXT_PUBLIC_* variable therefore configures both halves.
 */
const PUBLIC_FALLBACK: Record<number, string> = {
  4663: "https://rpc.mainnet.chain.robinhood.com",
  46630: "https://rpc.testnet.chain.robinhood.com",
  31337: "http://127.0.0.1:8545",
};

const ENV_KEYS: Record<number, string[]> = {
  4663: ["ROBINHOOD_RPC_URL", "NEXT_PUBLIC_ROBINHOOD_RPC_URL"],
  46630: ["ROBINHOOD_TESTNET_RPC_URL", "NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL"],
  31337: ["DEVNET_RPC_URL", "NEXT_PUBLIC_DEVNET_RPC_URL"],
};

export function rpcFor(chainId: number): string | undefined {
  for (const key of ENV_KEYS[chainId] ?? []) {
    const value = process.env[key];
    if (value) return value;
  }
  return PUBLIC_FALLBACK[chainId];
}
