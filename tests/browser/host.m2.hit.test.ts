import { expect, test } from "@playwright/test";

/**
 * M2b acceptance: elementFromPoint hit probe at transformed points.
 * Hit proof is recorded in host.state().admission.hit.
 */

test.describe("M2b hit probe", () => {
  test("runHitProbe matches interior points and misses exterior under transform", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(() => window.__admission.runHitProbe());
    expect(result.ok).toBe(true);
    expect(result.transform).toMatch(/translate/);
    expect(result.samples.length).toBeGreaterThanOrEqual(8);

    const interior = result.samples.filter((s) => s.expectedId);
    const exterior = result.samples.filter((s) => s.expectedId === null);
    expect(interior.length).toBeGreaterThanOrEqual(5);
    expect(exterior.length).toBeGreaterThanOrEqual(3);
    for (const s of interior) {
      expect(s.matched, `interior ${s.label} at ${s.client.x},${s.client.y} → ${s.actualId}`).toBe(true);
      expect(s.actualId).toBe("figment-hit-probe-target");
    }
    for (const s of exterior) {
      expect(s.matched, `exterior ${s.label}`).toBe(true);
    }
    expect(result.detail).toMatch(/hit probe ok/i);

    const leftovers = await page.evaluate(
      () => document.querySelectorAll("[data-figment-hit-probe]").length,
    );
    expect(leftovers).toBe(0);
  });

  test("host.admit() records hit proof alongside pixel proof", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const admission = await page.evaluate(async () => {
      await window.__figment.host.admit();
      return window.__figment.host.state().admission;
    });

    expect(admission?.pixel.ok).toBe(true);
    expect(admission?.hit.ok).toBe(true);
    expect(admission?.hit.detail).toMatch(/hit probe ok/i);
    expect(admission?.hit.samples.some((s) => s.label === "center")).toBe(true);
  });

  test("react host.admit() records matching hit proof", async ({ page }) => {
    await page.goto("http://127.0.0.1:5174/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const admission = await page.evaluate(async () => {
      await window.__figment.host.admit();
      return window.__figment.host.state().admission;
    });
    expect(admission?.hit.ok).toBe(true);
    expect(admission?.hit.samples.filter((s) => !s.matched)).toEqual([]);
  });
});
