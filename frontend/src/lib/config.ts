import { generatedDeployments } from "./deployments.generated";
import { DEFAULT_CHAIN_ID } from "./chains";

export type Address = `0x${string}`;

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export type Deployment = {
  chainId: number;
  /** True when the market on this chain is mocks published by our own deploy
   *  script rather than a real venue. Drives the SIMULATED marker in the UI. */
  simulated: boolean;
  registry: Address;
  quote: Address;
  quoteFeed?: Address;
  router?: Address;
  targets?: Address[];
  feeds?: Address[];
  symbols?: string[];
};

/**
 * Address book resolution order:
 *   1. NEXT_PUBLIC_TIDE_REGISTRY / NEXT_PUBLIC_TIDE_QUOTE for the active chain
 *   2. whatever `forge script` last wrote into contracts/deployments
 *
 * Env wins so a Vercel deployment can point at a real registry without a
 * rebuild of the contracts package.
 */
function envDeployment(chainId: number): Partial<Deployment> {
  const suffix = `_${chainId}`;
  const pick = (base: string) =>
    (process.env[`${base}${suffix}`] || process.env[base] || "") as string;

  const registry = pick("NEXT_PUBLIC_TIDE_REGISTRY");
  const quote = pick("NEXT_PUBLIC_TIDE_QUOTE");
  const router = pick("NEXT_PUBLIC_TIDE_ROUTER");

  return {
    ...(registry ? { registry: registry as Address } : {}),
    ...(quote ? { quote: quote as Address } : {}),
    ...(router ? { router: router as Address } : {}),
  };
}

export function getDeployment(chainId: number | undefined): Deployment | undefined {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  const generated = generatedDeployments[id];
  const env = envDeployment(id);
  const merged = { ...generated, ...env } as Deployment;

  if (!merged.registry || merged.registry === ZERO_ADDRESS) return undefined;
  if (!merged.quote || merged.quote === ZERO_ADDRESS) return undefined;

  return { ...merged, chainId: id, simulated: Boolean(merged.simulated) };
}

/** True when the app has no contract addresses for this chain and must say so. */
export function isConfigured(chainId: number | undefined): boolean {
  return getDeployment(chainId) !== undefined;
}

export const PROTOCOL = {
  /** Mirrors TideVault.MAX_FEE_BPS. Displayed as the guaranteed ceiling. */
  maxFeeBps: 50,
  maxSlippageBps: 1000,
  minIntervalSeconds: 3600,
  maxIntervalSeconds: 365 * 24 * 3600,
  priceScale: 100_000_000n, // 1e8
} as const;

export const CADENCES = [
  { label: "Daily", seconds: 86_400, note: "5 buys a week while the market is open" },
  { label: "Weekly", seconds: 604_800, note: "The default. One buy every 7 days" },
  { label: "Fortnightly", seconds: 1_209_600, note: "Matches a two-week pay cycle" },
  { label: "Monthly", seconds: 2_592_000, note: "One buy every 30 days" },
] as const;
