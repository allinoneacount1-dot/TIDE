/**
 * Minimal ABI fragments the keeper needs.
 *
 * Hand-scoped rather than generated: the keeper should be able to call exactly
 * three things and nothing else, and keeping the surface this small makes that
 * auditable at a glance.
 */
export const registryAbi = [
  { type: "function", name: "vaultCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "vaultsSlice",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
  },
  { type: "function", name: "executionsHalted", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
];

export const vaultAbi = [
  { type: "function", name: "keeper", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "quote", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "plansLength", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "getPlan",
    inputs: [{ type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "target", type: "address" },
          { name: "maxSlippageBps", type: "uint16" },
          { name: "active", type: "bool" },
          { name: "targetDecimals", type: "uint8" },
          { name: "cyclesExecuted", type: "uint32" },
          { name: "cyclesTotal", type: "uint32" },
          { name: "amountPerCycle", type: "uint128" },
          { name: "interval", type: "uint64" },
          { name: "nextExecution", type: "uint64" },
          { name: "limitPrice", type: "uint128" },
          { name: "totalIn", type: "uint128" },
          { name: "totalOut", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canExecute",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "bool" }, { type: "uint8" }, { type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "requiredOutFor",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "planId", type: "uint256" },
      { name: "minOut", type: "uint256" },
      { name: "router", type: "address" },
      { name: "spender", type: "address" },
      { name: "swapData", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

export const mockRouterAbi = [
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "quoteOut",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
];

/** TideVault.Readiness, mirrored for log messages. */
export const READINESS = [
  "Ready",
  "PlanInactive",
  "PlanComplete",
  "NotDue",
  "InsufficientCapital",
  "VaultPaused",
  "ProtocolHalted",
  "OracleStale",
  "Unguarded",
];
