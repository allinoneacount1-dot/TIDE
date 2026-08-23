import { describe, it, expect } from "vitest";
import { classifyError, decodeRevert, TX_PHASE, TX_RAIL } from "@/lib/lifecycle";
import { readinessOf, Readiness, READINESS } from "@/lib/readiness";

describe("classifyError", () => {
  it("separates a declined signature from a failure", () => {
    // A rejected signature costs nothing and is not an error state.
    const rejected = classifyError(new Error("User rejected the request."));
    expect(rejected.phase).toBe("rejected");
    expect(TX_PHASE.rejected.tone).toBe("neutral");
  });

  it("separates a timeout from a revert", () => {
    // A timeout means "unknown", and reporting it as failure is a lie the user
    // may act on.
    expect(classifyError(new Error("Timed out while waiting for receipt")).phase).toBe("timeout");
    expect(TX_PHASE.timeout.tone).toBe("warn");
  });

  it("identifies transport failures", () => {
    expect(classifyError(new Error("HTTP request failed")).phase).toBe("rpc-error");
    expect(classifyError(new Error("insufficient funds for gas")).phase).toBe("rpc-error");
  });

  it("falls back to revert with a decoded message", () => {
    const r = classifyError(new Error("execution reverted: SlippageExceeded(1,2)"));
    expect(r.phase).toBe("reverted");
    expect(r.message).toMatch(/price guard/i);
  });

  it("never throws on a non-Error value", () => {
    expect(() => classifyError(undefined)).not.toThrow();
    expect(() => classifyError({ weird: true })).not.toThrow();
    expect(() => classifyError("plain string")).not.toThrow();
  });
});

describe("decodeRevert", () => {
  it("turns every contract error into something actionable", () => {
    expect(decodeRevert("NotReady(3)")).toMatch(/not executable/i);
    expect(decodeRevert("RouterNotAllowed")).toMatch(/allowlist/i);
    expect(decodeRevert("OverSpend")).toMatch(/more than one cycle/i);
    expect(decodeRevert("ERC20InsufficientAllowance")).toMatch(/approve/i);
    expect(decodeRevert("EnforcedPause")).toMatch(/paused/i);
  });

  it("extracts a plain reason string when present", () => {
    expect(decodeRevert(`reverted with reason string 'SLIPPAGE'`)).toBe("SLIPPAGE");
  });

  it("truncates an unrecognised blob rather than flooding the UI", () => {
    expect(decodeRevert("x".repeat(400)).length).toBeLessThanOrEqual(181);
  });
});

describe("transaction rail", () => {
  it("treats submitted and confirmed as distinct steps", () => {
    // The whole point: a broadcast is not a success.
    expect(TX_RAIL).toContain("submitted");
    expect(TX_RAIL).toContain("confirmed");
    expect(TX_RAIL.indexOf("submitted")).toBeLessThan(TX_RAIL.indexOf("confirmed"));
    expect(TX_PHASE.submitted.tone).toBe("progress");
    expect(TX_PHASE.confirmed.tone).toBe("success");
  });

  it("marks only terminal phases as terminal", () => {
    expect(TX_PHASE.confirmed.terminal).toBe(true);
    expect(TX_PHASE.reverted.terminal).toBe(true);
    expect(TX_PHASE.pending.terminal).toBe(false);
    expect(TX_PHASE.submitted.terminal).toBe(false);
  });
});

describe("readiness", () => {
  it("covers every contract enum member", () => {
    const codes = Object.values(Readiness).filter((v) => typeof v === "number") as number[];
    for (const code of codes) {
      expect(READINESS[code as Readiness]).toBeDefined();
      expect(READINESS[code as Readiness].detail.length).toBeGreaterThan(20);
    }
  });

  it("degrades safely on an unknown code from a newer contract", () => {
    const unknown = readinessOf(99);
    expect(unknown.tone).toBe("blocked");
    expect(unknown.label).toBe("Unknown");
  });

  it("explains a stale oracle as an expected wait, not a fault", () => {
    expect(READINESS[Readiness.OracleStale].tone).toBe("waiting");
    expect(READINESS[Readiness.OracleStale].detail).toMatch(/market hours|24\/5/i);
  });

  it("never suggests withdrawal is blocked", () => {
    for (const copy of Object.values(READINESS)) {
      expect(copy.detail).not.toMatch(/cannot withdraw|withdrawal is blocked/i);
    }
  });
});
