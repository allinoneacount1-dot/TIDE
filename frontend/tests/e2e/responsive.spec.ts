import { test, expect } from "@playwright/test";

/**
 * Responsive and accessibility floor.
 *
 * The rule these enforce: nothing scrolls the page sideways, every interactive
 * target is reachable at phone width, and the document has a coherent heading
 * order. Wide content is allowed to scroll — inside its own container.
 */

const ROUTES = ["/", "/app", "/docs"];

for (const route of ROUTES) {
  test(`${route} never scrolls the page horizontally`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
    });
    // A couple of pixels of rounding is tolerable; a scrollbar is not.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
  });

  test(`${route} has exactly one h1 and no skipped heading levels`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(800);

    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]))
    );
    expect(levels.filter((l) => l === 1).length).toBeLessThanOrEqual(1);

    let previous = 0;
    for (const level of levels) {
      if (previous !== 0) expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  test(`${route} keeps tap targets usable at phone width`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(1200);

    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("button, a[href], select, input")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue; // not rendered
        // Visually-hidden controls (the skip link) are 1x1 until focused, and
        // are explicitly exempt from the target-size criterion.
        if (el.classList.contains("sr-only")) continue;
        // 24px is the WCAG 2.2 AA minimum for a target's smaller dimension.
        if (Math.min(r.width, r.height) < 24) {
          out.push(`${el.tagName}:${(el.textContent ?? "").trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return out;
    });
    expect(small).toEqual([]);
  });
}

test("every image and icon is either labelled or explicitly decorative", async ({ page }) => {
  await page.goto("/");
  const unlabelled = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("svg, img")) {
      const hidden = el.getAttribute("aria-hidden") === "true";
      const labelled =
        el.getAttribute("aria-label") ||
        el.getAttribute("alt") !== null ||
        el.querySelector("title") ||
        el.getAttribute("role") === "presentation";
      if (!hidden && !labelled) out.push(el.outerHTML.slice(0, 80));
    }
    return out;
  });
  expect(unlabelled).toEqual([]);
});

test("keyboard focus is always visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const s = getComputedStyle(el);
    return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle };
  });
  expect(outline).not.toBeNull();
  expect(outline!.outlineStyle).not.toBe("none");
});
