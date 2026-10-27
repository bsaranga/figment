import { expect, test } from "@playwright/test";

/**
 * M2a acceptance: functional pixel probe (known-color draw + readback).
 * Not a property sniff — only a successful getImageData match admits.
 */

test.describe("M2a pixel probe", () => {
  test("standalone assertPixelProbe passes and leaves no DOM residue", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(() => window.__admission.runPixelProbe());
    expect(result.ok).toBe(true);
    expect(result.expectedHex).toMatch(/c23f53/i);
    expect(result.actual?.a).toBeGreaterThan(200);
    expect(result.detail).toMatch(/pixel probe ok/i);

    const leftovers = await page.evaluate(
      () => document.querySelectorAll("[data-figment-probe]").length,
    );
    expect(leftovers).toBe(0);
  });

  test("host.admit() records pixel proof in state()", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const admission = await page.evaluate(async () => {
      const result = await window.__figment.host.admit();
      return { result, state: window.__figment.host.state().admission };
    });

    expect(admission.result.pixel.ok).toBe(true);
    expect(admission.result.pixel.detail).toMatch(/pixel probe ok/i);
    expect(admission.result.hit.ok).toBe(true);
    expect(admission.state?.pixel.ok).toBe(true);
    expect(admission.state?.hit.ok).toBe(true);
  });

  test("react host.admit() matches vanilla proof", async ({ page }) => {
    await page.goto("http://127.0.0.1:5174/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const admission = await page.evaluate(async () => {
      await window.__figment.host.admit();
      return window.__figment.host.state().admission;
    });
    expect(admission?.pixel.ok).toBe(true);
    expect(admission?.hit.ok).toBe(true);
  });
});
