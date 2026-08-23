import { describe, it, expect } from "vitest";
import {
  formatUnitsExact,
  formatQuote,
  formatShares,
  formatPrice,
  parseUnitsSafe,
  shortAddress,
  formatRelative,
  formatCadence,
  formatBps,
  priceDelta,
} from "@/lib/format";

/**
 * These are money formatters, so the tests are about exactness rather than
 * pleasant output. Every case that could silently lose a digit is pinned.
 */
describe("formatUnitsExact", () => {
  it("never loses precision to floating point", () => {
    // 0.1 + 0.2 territory: this value is not representable as a double.
    expect(formatUnitsExact(123456789012345678n, 18, 18)).toBe("0.123456789012345678");
    // Beyond Number.MAX_SAFE_INTEGER.
    expect(formatUnitsExact(9007199254740993n, 0)).toBe("9,007,199,254,740,993");
  });

  it("groups the integer part and trims trailing zeros", () => {
    expect(formatUnitsExact(1234567890n, 6)).toBe("1,234.56789");
    expect(formatUnitsExact(1000000n, 6)).toBe("1");
  });

  it("truncates rather than rounds, so a balance is never overstated", () => {
    expect(formatUnitsExact(1999999n, 6, 2)).toBe("1.99");
  });

  it("handles zero and negatives", () => {
    expect(formatUnitsExact(0n, 6)).toBe("0");
    expect(formatUnitsExact(-1500000n, 6)).toBe("-1.5");
  });
});

describe("formatQuote", () => {
  it("always shows exactly two decimals", () => {
    expect(formatQuote(1000000n, 6)).toBe("1.00");
    expect(formatQuote(1500000n, 6)).toBe("1.50");
    expect(formatQuote(99850000n, 6)).toBe("99.85");
  });

  it("renders an em dash for absent data instead of zero", () => {
    // A missing balance and a zero balance mean different things.
    expect(formatQuote(undefined, 6)).toBe("—");
    expect(formatQuote(0n, 6)).toBe("0.00");
  });
});

describe("formatShares and formatPrice", () => {
  it("shows enough share precision to see a small recurring buy", () => {
    expect(formatShares(547423245614035087n, 18)).toBe("0.547423");
  });

  it("treats a zero price as no price", () => {
    expect(formatPrice(0n)).toBe("—");
    expect(formatPrice(18240000000n)).toBe("182.40");
  });
});

describe("parseUnitsSafe", () => {
  it("round trips through the formatter", () => {
    const parsed = parseUnitsSafe("182.40", 8);
    expect(parsed).toBe(18240000000n);
  });

  it("rejects more decimals than the token has", () => {
    expect(parseUnitsSafe("1.1234567", 6)).toBeNull();
    expect(parseUnitsSafe("1.123456", 6)).toBe(1123456n);
  });

  it("rejects anything that is not a plain decimal", () => {
    for (const bad of ["", "abc", "1.2.3", "-5", "1e18", "0x10", " "]) {
      expect(parseUnitsSafe(bad, 6)).toBeNull();
    }
  });

  it("accepts grouped input pasted from the UI", () => {
    expect(parseUnitsSafe("1,000.50", 6)).toBe(1000500000n);
  });
});

describe("formatRelative", () => {
  const now = 1_760_000_000;
  it("reads forwards and backwards", () => {
    expect(formatRelative(now + 86_400 * 4 + 3_600 * 6, now)).toBe("in 4d 06h");
    expect(formatRelative(now - 7_200, now)).toBe("2h 00m ago");
  });
  it("collapses to now inside a few seconds", () => {
    expect(formatRelative(now + 1, now)).toBe("now");
  });
});

describe("formatCadence", () => {
  it("names the common intervals", () => {
    expect(formatCadence(604_800)).toBe("every week");
    expect(formatCadence(1_209_600)).toBe("every 2 weeks");
    expect(formatCadence(86_400)).toBe("every day");
    expect(formatCadence(2_592_000)).toBe("every month");
    expect(formatCadence(3_600)).toBe("every hour");
  });
  it("falls back to seconds rather than lying about the period", () => {
    expect(formatCadence(5_000)).toBe("every 5000s");
  });
});

describe("shortAddress", () => {
  it("keeps both ends recognisable", () => {
    expect(shortAddress("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168")).toBe("0x5fc5…d168");
  });
  it("returns an em dash when there is nothing to show", () => {
    expect(shortAddress(undefined)).toBe("—");
  });
});

describe("formatBps and priceDelta", () => {
  it("renders basis points as a percentage", () => {
    expect(formatBps(15)).toBe("0.15%");
    expect(formatBps(50)).toBe("0.50%");
    expect(formatBps(100)).toBe("1%");
  });

  it("returns null rather than a fabricated zero when there is nothing to compare", () => {
    expect(priceDelta(undefined, 100n)).toBeNull();
    expect(priceDelta(100n, undefined)).toBeNull();
    expect(priceDelta(100n, 0n)).toBeNull();
  });

  it("signs the direction", () => {
    expect(priceDelta(11000n, 10000n)).toEqual({ text: "+10.00%", direction: "up" });
    expect(priceDelta(9000n, 10000n)).toEqual({ text: "-10.00%", direction: "down" });
    expect(priceDelta(10000n, 10000n)?.direction).toBe("flat");
  });
});
