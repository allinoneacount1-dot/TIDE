import { test, expect } from "@playwright/test";

/**
 * Layout regressions that a build passes and a person notices immediately.
 *
 * The first one here is not hypothetical: the mechanism section shipped with all
 * six acts stacked on top of each other, unreadable. React and GSAP were both
 * writing `element.style.opacity`, and React won on every re-render, so the
 * value GSAP set was silently discarded. Typecheck passed, lint passed, the
 * build passed, and the page was broken.
 *
 * Anything that hides one element behind another needs an assertion, because
 * nothing else in the pipeline can see it.
 */

test("only one mechanism act is visible at a time", async ({ page }, testInfo) => {
  // The stacked, cross-faded layout is desktop-only; mobile lays the acts out in
  // normal flow, where all six are legitimately visible.
  test.skip(testInfo.project.name !== "desktop", "desktop-only layout");

  await page.goto("/");
  await page.locator("#mechanism").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  const opacities = await page.evaluate(() =>
    [...document.querySelectorAll("[data-act]")].map((el) => Number(getComputedStyle(el).opacity))
  );

  expect(opacities.length).toBeGreaterThan(1);
  expect(opacities.filter((o) => o > 0.5)).toHaveLength(1);
});

test("no visible act overlaps another", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only layout");

  await page.goto("/");
  await page.locator("#mechanism").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll("[data-act]")]
      .filter((el) => Number(getComputedStyle(el).opacity) > 0.5)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })
  );

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const overlaps = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      expect(overlaps, `act ${i} overlaps act ${j}`).toBe(false);
    }
  }
});

test("the hero headline is not clipped by its reveal mask", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2000);

  // The masked line reveal uses overflow-hidden wrappers. If a descender is cut
  // off, the inner span is taller than the mask that contains it.
  const clipped = await page.evaluate(
    () =>
      [...document.querySelectorAll("[data-line-inner]")].filter((inner) => {
        const mask = inner.parentElement;
        if (!mask) return false;
        return inner.getBoundingClientRect().height > mask.getBoundingClientRect().height + 1;
      }).length
  );
  expect(clipped).toBe(0);
});
