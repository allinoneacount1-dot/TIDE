import { defineChain } from "viem";

/**
 * Robinhood Chain network definitions.
 *
 * Chain IDs, RPCs and explorers are from docs.robinhood.com/chain/connecting.
 * The previous build shipped three different chain IDs in three different files
 * (97468, 46630, 31337) and none of them was mainnet — so these are pinned in
 * one place and imported everywhere.
 *
 * The chain is Arbitrum Nitro. Two consequences the UI has to respect:
 *   • `block.number` is an *estimated L1* block number, so anything user-facing
 *     that says "block" must come from the RPC's L2 head, never from a contract.
 *   • Fees are L2 execution + L1 calldata, so a gas estimate that only prices
 *     execution understates the cost.
 */

const publicMainnetRpc = "https://rpc.mainnet.chain.robinhood.com";
const publicTestnetRpc = "https://rpc.testnet.chain.robinhood.com";

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || publicMainnetRpc],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1,
    },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL || publicTestnetRpc],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" },
  },
});

/** Local Anvil, used by the dev loop and the Playwright suite. */
export const tideDevnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_DEVNET_CHAIN_ID || 31337),
  name: "TIDE Devnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_DEVNET_RPC_URL || "http://127.0.0.1:8545"] } },
  blockExplorers: { default: { name: "Local", url: "http://127.0.0.1:8545" } },
});

export const SUPPORTED_CHAINS = [robinhood, robinhoodTestnet, tideDevnet] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

/** The chain the app targets when the wallet is on something unrecognised. */
export const DEFAULT_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || robinhoodTestnet.id
) as SupportedChainId;

export function getChain(chainId: number | undefined) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId);
}

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return SUPPORTED_CHAINS.some((c) => c.id === chainId);
}

export function explorerTxUrl(chainId: number | undefined, hash: string) {
  const base = getChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : undefined;
}

export function explorerAddressUrl(chainId: number | undefined, address: string) {
  const base = getChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/address/${address}` : undefined;
}
