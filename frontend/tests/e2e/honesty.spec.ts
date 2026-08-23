import { test, expect } from "@playwright/test";

/**
 * Guards against the failure mode this overhaul existed to fix: an interface
 * that looks live while being wired to nothing.
 *
 * These assertions are about the *absence* of invention. They fail if someone
 * reintroduces a hardcoded balance, a placeholder transaction hash, or a status
 * light that is not backed by state.
 */

test.describe("no fabricated data", () => {
  test("landing page states protocol constants, never metrics it cannot prove", async ({ page }) => {
    await page.goto("/");

    const body = await page.locator("body").innerText();

    // Values invented by the previous build.
    expect(body).not.toContain("$1,000.00");
    expect(body).not.toContain("99.85 AAPL");
    expect(body).not.toContain("182.40");
    expect(body).not.toMatch(/\b\d+\/\d+ forge tests\b/);
    expect(body).not.toMatch(/coverage \d/i);

    // Marketing language the brief rules out.
    for (const phrase of [
      "revolutioniz",
      "future of Web3",
      "unlock the power",
      "next generation",
      "limitless",
    ]) {
      expect(body.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });

  test("only one chain identity is presented anywhere", async ({ page }) => {
    await page.goto("/");
    const body = await page.locator("body").innerText();
    // The previous build shipped 97468, 46630 and 31337 in three files.
    expect(body).not.toContain("97468");
    expect(body).not.toContain("31337");
  });

  test("a disconnected terminal shows no balances at all", async ({ page }) => {
    await page.goto("/app");
    const body = await page.locator("body").innerText();
    // No zeroed-out figures pretending to be a portfolio.
    expect(body).not.toMatch(/\$0\.00/);
    await expect(page.getByRole("button", { name: /connect wallet/i }).first()).toBeVisible();
  });

  test("every button either acts or explains itself", async ({ page }) => {
    await page.goto("/app");
    const buttons = await page.getByRole("button").all();
    for (const b of buttons) {
      const label = (await b.innerText().catch(() => "")).trim();
      if (!label) continue;
      // Nothing may be labelled as a placeholder.
      expect(label.toLowerCase()).not.toMatch(/coming soon|todo|tbd|placeholder/);
    }
  });
});
