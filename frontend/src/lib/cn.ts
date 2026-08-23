/** Minimal class joiner. A dependency for this would be silly. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
