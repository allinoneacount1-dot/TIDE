/**
 * TideVault.Readiness, mirrored.
 *
 * The contract returns a reason code rather than a bare boolean specifically so
 * the interface can answer "why is nothing happening?" without guessing. Each
 * code carries the copy, the severity, and whether the user can act on it.
 */
export enum Readiness {
  Ready = 0,
  PlanInactive = 1,
  PlanComplete = 2,
  NotDue = 3,
  InsufficientCapital = 4,
  VaultPaused = 5,
  ProtocolHalted = 6,
  OracleStale = 7,
  Unguarded = 8,
}

export type ReadinessTone = "ready" | "waiting" | "attention" | "blocked";

export type ReadinessCopy = {
  label: string;
  detail: string;
  tone: ReadinessTone;
  /** The single thing the user can do about it, if anything. */
  action?: "deposit" | "resume" | "unpause" | "setLimit" | "none";
};

export const READINESS: Record<Readiness, ReadinessCopy> = {
  [Readiness.Ready]: {
    label: "Execution ready",
    detail: "The window is open and every guard passes. The keeper can settle this cycle now.",
    tone: "ready",
  },
  [Readiness.PlanInactive]: {
    label: "Paused",
    detail: "You disarmed this plan. Its history is intact and it resumes on the next full interval.",
    tone: "waiting",
    action: "resume",
  },
  [Readiness.PlanComplete]: {
    label: "Complete",
    detail: "Every scheduled cycle has run. Capital and holdings stay withdrawable.",
    tone: "waiting",
    action: "none",
  },
  [Readiness.NotDue]: {
    label: "Armed",
    detail: "Waiting for the next window. Nothing to do.",
    tone: "waiting",
  },
  [Readiness.InsufficientCapital]: {
    label: "Underfunded",
    detail: "Idle capital is below one cycle. The next window will pass without executing.",
    tone: "attention",
    action: "deposit",
  },
  [Readiness.VaultPaused]: {
    label: "Vault paused",
    detail: "You paused this vault. Deposits and executions are stopped; withdrawal stays open.",
    tone: "attention",
    action: "unpause",
  },
  [Readiness.ProtocolHalted]: {
    label: "Protocol halted",
    detail:
      "Executions are stopped protocol-wide. Your funds are unaffected and withdrawal is never gated.",
    tone: "blocked",
  },
  [Readiness.OracleStale]: {
    label: "Awaiting market",
    detail:
      "The Chainlink equity feed has not updated inside the freshness window. Equity feeds run 24/5, so this is the normal state outside market hours — execution resumes when the market reopens.",
    tone: "waiting",
  },
  [Readiness.Unguarded]: {
    label: "No price guard",
    detail:
      "This asset has no registry price feed, and no limit price is set. TIDE will not execute an unguarded trade. Set a limit price to enable it.",
    tone: "blocked",
    action: "setLimit",
  },
};

export function readinessOf(code: number | undefined): ReadinessCopy {
  if (code === undefined || !(code in READINESS)) {
    return {
      label: "Unknown",
      detail: "The vault returned a readiness code this build does not recognise.",
      tone: "blocked",
    };
  }
  return READINESS[code as Readiness];
}
