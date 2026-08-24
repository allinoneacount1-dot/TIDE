import { describe, expect, it } from "vitest";
import { generatedDeployments } from "@/lib/deployments.generated";
import { tideDevnet, robinhood, robinhoodTestnet } from "@/lib/chains";

/**
 * `deployments.generated.ts` is committed, because Vercel builds the frontend
 * without Foundry and would otherwise have no address book at all.
 *
 * That convenience has a sharp edge, and it has already cut once. Running the
 * local devnet rewrites this file with Anvil's addresses. A `git add -A` from
 * that working tree ships a devnet address book to production, the app offers
 * a Create Vault button, and every call returns `0x` because nothing is
 * deployed at those addresses on the real chain. That is exactly the bug that
 * reached users.
 *
 * The app now verifies bytecode before acting, so the symptom is contained.
 * This is the other half: the file itself must never carry a devnet.
 */
describe("the committed address book", () => {
  const entries = Object.entries(generatedDeployments);

  it("carries no devnet address book", () => {
    const devnet = entries.filter(([id]) => Number(id) === tideDevnet.id);
    expect(
      devnet,
      `contracts/deployments/${tideDevnet.id}.json was mirrored into the committed ` +
        `address book. Run \`node scripts/sync-contracts.mjs\` with that record deleted, ` +
        `or check out the file, before committing.`
    ).toEqual([]);
  });

  it("names only chains the app supports", () => {
    const known = [robinhood.id, robinhoodTestnet.id, tideDevnet.id];
    for (const [id] of entries) {
      expect(known, `chain ${id} is not a supported chain`).toContain(Number(id));
    }
  });

  it("agrees with the chain id inside each record", () => {
    for (const [id, d] of entries) {
      expect(d.chainId, `record filed under ${id} declares ${d.chainId}`).toBe(Number(id));
    }
  });
});
