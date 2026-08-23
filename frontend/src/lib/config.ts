export const ADDRESSES = {
  factory: (process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  aaplx: (process.env.NEXT_PUBLIC_AAPLx_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  aggregator: (process.env.NEXT_PUBLIC_AGGREGATOR_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const TOKENS = [
  { symbol: "AAPL.x", name: "Apple (tokenized)", address: ADDRESSES.aaplx, pythId: "0x..." },
  { symbol: "NVDA.x", name: "Nvidia (tokenized)", address: ADDRESSES.aaplx, pythId: "0x..." },
  { symbol: "SPY.x", name: "S&P 500 (tokenized)", address: ADDRESSES.aaplx, pythId: "0x..." },
] as const;

export const INTERVALS = [
  { label: "Weekly", value: 604800 },
  { label: "Bi-weekly", value: 1209600 },
  { label: "Monthly", value: 2592000 },
] as const;
