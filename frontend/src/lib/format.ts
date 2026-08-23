/**
 * Formatting is centralised because the numbers on this screen are money.
 * Every amount reaching the UI is a bigint in base units plus a decimals count;
 * nothing is converted to a JS number until the last possible moment, and never
 * before a comparison.
 */

export const PRICE_SCALE = 100_000_000n; // 1e8, matching Chainlink and PriceMath.sol

/** Exact base-units → decimal string. No float anywhere in the path. */
export function formatUnitsExact(value: bigint, decimals: number, maxFractionDigits = decimals): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;

  let fracStr = frac.toString().padStart(decimals, "0");
  if (maxFractionDigits < decimals) fracStr = fracStr.slice(0, maxFractionDigits);
  fracStr = fracStr.replace(/0+$/, "");

  const wholeStr = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeStr}${fracStr ? `.${fracStr}` : ""}`;
}

/** Money, always two decimals, always grouped. */
export function formatQuote(value: bigint | undefined, decimals: number): string {
  if (value === undefined) return "—";
  const s = formatUnitsExact(value, decimals, 2);
  const [w, f = ""] = s.split(".");
  return `${w}.${f.padEnd(2, "0")}`;
}

/** Share quantities: enough precision to see a small recurring buy move. */
export function formatShares(value: bigint | undefined, decimals: number): string {
  if (value === undefined) return "—";
  return formatUnitsExact(value, decimals, 6);
}

/** A 1e8-scaled price as a currency string. */
export function formatPrice(price: bigint | undefined): string {
  if (price === undefined || price === 0n) return "—";
  return formatQuote(price, 8);
}

export function parseUnitsSafe(input: string, decimals: number): bigint | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const [whole = "0", frac = ""] = trimmed.split(".");
  if (frac.length > decimals) return null;
  try {
    return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt((frac || "0").padEnd(decimals, "0"));
  } catch {
    return null;
  }
}

export function shortAddress(address?: string, lead = 6, tail = 4): string {
  if (!address) return "—";
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function shortHash(hash?: string): string {
  return shortAddress(hash, 10, 8);
}

/** "in 4d 06h" / "2h 14m ago" — the dashboard's primary time language. */
export function formatRelative(targetSeconds: number, nowSeconds: number): string {
  const delta = targetSeconds - nowSeconds;
  const abs = Math.abs(delta);
  const d = Math.floor(abs / 86_400);
  const h = Math.floor((abs % 86_400) / 3_600);
  const m = Math.floor((abs % 3_600) / 60);
  const s = Math.floor(abs % 60);

  let body: string;
  if (d > 0) body = `${d}d ${String(h).padStart(2, "0")}h`;
  else if (h > 0) body = `${h}h ${String(m).padStart(2, "0")}m`;
  else if (m > 0) body = `${m}m ${String(s).padStart(2, "0")}s`;
  else body = `${s}s`;

  if (abs < 5) return "now";
  return delta >= 0 ? `in ${body}` : `${body} ago`;
}

export function formatCadence(seconds: number): string {
  if (seconds % 2_592_000 === 0) return every(seconds / 2_592_000, "month");
  if (seconds % 604_800 === 0) return every(seconds / 604_800, "week");
  if (seconds % 86_400 === 0) return every(seconds / 86_400, "day");
  if (seconds % 3_600 === 0) return every(seconds / 3_600, "hour");
  return `every ${seconds}s`;
}

function every(n: number, unit: string): string {
  return n === 1 ? `every ${unit}` : `every ${n} ${unit}s`;
}

export function formatTimestamp(seconds: number | bigint): string {
  const ms = Number(seconds) * 1000;
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Basis points → percent string. */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`;
}

/**
 * Signed percentage change between two 1e8 prices, as a display string plus a
 * direction the UI can colour. Returns null when there is nothing to compare —
 * so callers render "—" instead of a fabricated 0.00%.
 */
export function priceDelta(
  current: bigint | undefined,
  reference: bigint | undefined
): { text: string; direction: "up" | "down" | "flat" } | null {
  if (!current || !reference || reference === 0n) return null;
  const diff = current - reference;
  const bps = (diff * 10_000n) / reference;
  const pct = Number(bps) / 100;
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`,
    direction: pct > 0.005 ? "up" : pct < -0.005 ? "down" : "flat",
  };
}
