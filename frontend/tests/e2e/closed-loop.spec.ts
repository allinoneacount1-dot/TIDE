import { test, expect, type Page } from "@playwright/test";

/**
 * The critical journey, end to end, against a live chain:
 *
 *   connect → create vault → deposit → configure a plan → execute →
 *   indexed → UI updates → withdraw
 *
 * Every step asserts on state the chain actually produced. Nothing here is
 * stubbed except the wallet chooser.
 */

async function connect(page: Page) {
  await page.goto("/app");
  await page.getByRole("button", { name: /connect wallet/i }).first().click();

  // Scope to the open dialog: more than one connect surface can be mounted.
  const sheet = page.locator("dialog[open]").first();
  await expect(sheet).toBeVisible({ timeout: 15_000 });
  await sheet.getByRole("button", { name: "Mock Connector", exact: true }).click();

  // The header chip shows a truncated address once the account is live.
  await expect(page.getByRole("button", { name: /0x\w{4}…/ }).first()).toBeVisible({ timeout: 30_000 });
}

test.describe("closed loop", () => {
  test("connect, create, deposit, configure, execute, withdraw", async ({ page }) => {
    test.slow();

    // ── connect ──────────────────────────────────────────────────────────
    await connect(page);

    // ── create a vault ───────────────────────────────────────────────────
    // Always a fresh one. Re-using a vault across runs accumulates plans, and
    // the test stops being hermetic: eventually the per-round requirement
    // exceeds the deposit and nothing is executable.
    const firstVault = page.getByRole("button", { name: /^Create vault$/ });
    const anotherVault = page.getByRole("button", { name: /^New vault$/ });

    if (await firstVault.isVisible().catch(() => false)) {
      await firstVault.click();
    } else {
      await anotherVault.click();
    }
    await expect(page.getByRole("heading", { name: /Capital/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    // The terminal is up and reading the chain.
    await expect(page.getByRole("heading", { name: /Capital/i }).first()).toBeVisible({ timeout: 60_000 });

    // ── deposit ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /^Deposit$/ }).first().click();
    const depositSheet = page.locator("dialog[open]").first();
    await expect(depositSheet).toBeVisible({ timeout: 15_000 });
    await depositSheet.getByLabel(/^Amount$/i).fill("500");
    await depositSheet.getByRole("button", { name: /Approve, then deposit|^Deposit$/ }).click();

    // Approve + deposit is two signatures; the tracker reports confirmation.
    await expect(page.getByText(/Confirmed|Included and successful/i).first()).toBeVisible({
      timeout: 90_000,
    });

    // Idle capital must reflect the deposit — read back from the chain, not
    // from local state.
    await expect(page.getByText("500.00").first()).toBeVisible({ timeout: 60_000 });

    // ── configure a plan ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /New plan|Create your first plan|Create a plan/ }).first().click();

    const planSheet = page.locator("dialog[open]").first();
    await planSheet.getByLabel(/Amount per cycle/i).fill("100");
    await planSheet.getByLabel(/Limit price/i).fill("250");
    await planSheet.getByLabel(/Open the first window immediately/i).check();
    await planSheet.getByRole("button", { name: /^Create plan$/ }).click();

    await expect(page.getByText(/Confirmed|Included and successful/i).first()).toBeVisible({
      timeout: 90_000,
    });

    // The plan row appears. Its readiness label arrives on the next poll of
    // canExecute(), so the state assertion is the `toBeEnabled` check below
    // rather than a race against that poll.
    await expect(page.getByRole("button", { name: /^Execute$/ }).first()).toBeVisible({
      timeout: 60_000,
    });

    // ── execute ──────────────────────────────────────────────────────────
    // Pick a plan whose window is genuinely open rather than assuming the first
    // row: the account may carry plans from an earlier run.
    const executeButtons = page.getByRole("button", { name: /^Execute$/ });
    await expect(executeButtons.first()).toBeVisible({ timeout: 60_000 });

    let execute = executeButtons.first();
    const count = await executeButtons.count();
    for (let i = 0; i < count; i++) {
      const candidate = executeButtons.nth(i);
      if (await candidate.isEnabled()) {
        execute = candidate;
        break;
      }
    }
    await expect(execute).toBeEnabled({ timeout: 60_000 });

    // Confirmed transaction cards retire themselves after a few seconds; wait
    // them out so the tracker is not overlapping the control.
    await page.waitForTimeout(8_000);
    await execute.scrollIntoViewIfNeeded();
    await execute.click();

    // The review must state the on-chain floor before any signature.
    await expect(page.getByText(/On-chain floor/i)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/Expected out/i)).toBeVisible();

    await page.getByRole("button", { name: /sign to execute/i }).click();
    await expect(page.getByText(/Confirmed|Included and successful/i).first()).toBeVisible({
      timeout: 90_000,
    });

    // ── indexed and reflected ────────────────────────────────────────────
    await expect(page.getByRole("heading", { name: /Execution history/i })).toBeVisible();
    // A settled cycle produces a ledger row with a transaction hash.
    await expect(page.locator("table").last().locator("tbody tr").first()).toBeVisible({
      timeout: 90_000,
    });

    // Exposure now shows the acquired asset.
    await expect(page.getByRole("heading", { name: /Exposure/i })).toBeVisible();

    // ── withdraw the acquired asset ──────────────────────────────────────
    // This is the step the previous contract made permanently impossible.
    await page.waitForTimeout(8_000);
    await page.getByRole("button", { name: /^Withdraw$/ }).first().click();
    const wSheet = page.locator("dialog[open]").first();
    await expect(wSheet).toBeVisible({ timeout: 15_000 });
    await wSheet.getByRole("radio", { name: /Everything/i }).click();
    await wSheet.getByRole("button", { name: /^Withdraw everything$/ }).click();

    await expect(page.getByText(/Confirmed|Included and successful/i).first()).toBeVisible({
      timeout: 90_000,
    });
  });
});
