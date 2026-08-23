import { http, createConfig } from "wagmi";
import { mainnet, arbitrumSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Robinhood L2 is Arbitrum Orbit — define as custom chain. Replace with official chainId/RPC when docs publish.
export const robinhoodL2 = {
  id: 97468, // placeholder — VERIFY from Robinhood docs before mainnet
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ROBINHOOD_L2_RPC || "https://sepolia-rollup.arbitrum.io/rpc"] } },
  blockExplorers: { default: { name: "Explorer", url: process.env.NEXT_PUBLIC_ROBINHOOD_L2_EXPLORER || "https://sepolia.arbiscan.io" } },
  testnet: true,
} as const;

export const config = createConfig({
  chains: [robinhoodL2, arbitrumSepolia, mainnet],
  transports: {
    [robinhoodL2.id]: http(),
    [arbitrumSepolia.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [injected(), walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo" })],
  ssr: true,
});
