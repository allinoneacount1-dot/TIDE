/**
 * The transaction lifecycle every on-chain action in TIDE moves through.
 *
 * The rule this encodes: nothing is called successful before a receipt with
 * status "success" is in hand. "Submitted" and "confirmed" are different words
 * on this screen because they are different facts.
 */
export type TxPhase =
  | "idle"
  | "wallet-required"
  | "wrong-network"
  | "review"
  | "simulating"
  | "awaiting-signature"
  | "submitted"
  | "pending"
  | "confirmed"
  | "reverted"
  | "rejected"
  | "rpc-error"
  | "timeout";

export type TxTone = "neutral" | "progress" | "success" | "warn" | "error";

export const TX_PHASE: Record<TxPhase, { label: string; detail: string; tone: TxTone; terminal: boolean }> = {
  idle: { label: "Ready", detail: "", tone: "neutral", terminal: false },
  "wallet-required": {
    label: "Wallet required",
    detail: "Connect a wallet to continue.",
    tone: "warn",
    terminal: false,
  },
  "wrong-network": {
    label: "Wrong network",
    detail: "Switch to the network this vault lives on.",
    tone: "warn",
    terminal: false,
  },
  review: { label: "Review", detail: "Check the terms before signing.", tone: "neutral", terminal: false },
  simulating: {
    label: "Simulating",
    detail: "Running the call against the current chain state to catch a revert before it costs gas.",
    tone: "progress",
    terminal: false,
  },
  "awaiting-signature": {
    label: "Awaiting signature",
    detail: "Confirm in your wallet.",
    tone: "progress",
    terminal: false,
  },
  submitted: {
    label: "Submitted",
    detail: "Broadcast to the sequencer. Not yet confirmed.",
    tone: "progress",
    terminal: false,
  },
  pending: {
    label: "Settling",
    detail: "Waiting for the receipt.",
    tone: "progress",
    terminal: false,
  },
  confirmed: { label: "Confirmed", detail: "Included and successful.", tone: "success", terminal: true },
  reverted: {
    label: "Reverted",
    detail: "The transaction was included but the contract rejected it. Gas was spent.",
    tone: "error",
    terminal: true,
  },
  rejected: {
    label: "Rejected in wallet",
    detail: "You declined the signature. Nothing was sent and nothing was spent.",
    tone: "neutral",
    terminal: true,
  },
  "rpc-error": {
    label: "Network error",
    detail: "The RPC could not be reached. The transaction may or may not have been broadcast.",
    tone: "error",
    terminal: true,
  },
  timeout: {
    label: "Timed out",
    detail: "No receipt within the wait window. Check the explorer before retrying.",
    tone: "warn",
    terminal: true,
  },
};

/** Ordered rail shown in the transaction drawer. */
export const TX_RAIL: TxPhase[] = ["review", "awaiting-signature", "submitted", "pending", "confirmed"];

const REJECTION_PATTERNS = [
  "user rejected",
  "user denied",
  "rejected the request",
  "action_rejected",
  "userrejected",
];

/** Maps a thrown wallet/RPC error onto a phase, without swallowing the cause. */
export function classifyError(error: unknown): { phase: TxPhase; message: string } {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error ?? {});
  const lower = raw.toLowerCase();

  if (REJECTION_PATTERNS.some((p) => lower.includes(p))) {
    return { phase: "rejected", message: "Signature declined in wallet." };
  }
  if (lower.includes("insufficient funds")) {
    return {
      phase: "rpc-error",
      message: "Not enough ETH to cover gas on this network.",
    };
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return { phase: "timeout", message: "The node stopped responding before a receipt arrived." };
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("http request failed")) {
    return { phase: "rpc-error", message: "Could not reach the RPC endpoint." };
  }
  return { phase: "reverted", message: decodeRevert(raw) };
}

/**
 * Turns a custom-error revert into something a person can act on.
 * Every string here corresponds to an error selector declared in TideVault.sol.
 */
const REVERT_COPY: Record<string, string> = {
  NotReady: "The vault refused: this plan is not executable right now.",
  SlippageExceeded: "The route came back worse than your price guard allows. Nothing was swapped.",
  RouterNotAllowed: "That router is not on the protocol allowlist.",
  SpenderNotAllowed: "That spender is not on the protocol allowlist.",
  OverSpend: "The router tried to take more than one cycle of capital. Blocked.",
  NotOwner: "Only the vault owner can do that.",
  NotOwnerOrKeeper: "Only the vault owner or its keeper can execute.",
  ZeroAmount: "Amount must be greater than zero.",
  InvalidInterval: "That interval is outside the allowed range (1 hour to 1 year).",
  InvalidSlippage: "Slippage tolerance must be 10% or less.",
  TargetIsQuote: "A plan cannot buy the asset it spends.",
  SwapFailed: "The router call failed. Nothing was swapped.",
  ERC20InsufficientAllowance: "Approve the vault to spend your USDG first.",
  ERC20InsufficientBalance: "Your balance is below the amount requested.",
  EnforcedPause: "This vault is paused.",
};

export function decodeRevert(raw: string): string {
  for (const [name, copy] of Object.entries(REVERT_COPY)) {
    if (raw.includes(name)) return copy;
  }
  const match = raw.match(/reverted with reason string ['"](.+?)['"]/i);
  if (match) return match[1];
  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
}
