import { expect, test } from "@playwright/test";

/**
 * M1 acceptance: mount a form into the host, interact, assert paint + metrics.
 * Runs against demos/vanilla-mount via Vite.
 */

test.describe("vanilla mount", () => {
  test("mounts a form layer and reports healthy state", async ({ page }) => {
    await page.goto("/");
    const status = page.locator("#status");
    await expect(status).toHaveClass(/ok/);

    await page.waitForFunction(
      () => window.__figment.host.state().metrics.paints > 0,
    );
    const state = await page.evaluate(() => window.__figment.host.state());
    expect(state.backend).toBe("2d");
    expect(state.supported).toBe(true);
    expect(state.health).toBe("healthy");
    expect(state.layers.map((l) => l.id)).toContain("profile");
    expect(state.metrics.paints).toBeGreaterThan(0);
    expect(state.metrics.layersDrawn).toBeGreaterThan(0);
    expect(state.metrics.nestedCanvasMarks).toBeGreaterThanOrEqual(1);
  });

  test("typing in the form updates output and paint metrics", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);
    await page.waitForFunction(
      () => window.__figment.host.state().metrics.paints > 0,
    );

    const name = page.locator('[data-testid="name"]');
    await name.click();
    await name.fill("Grace");
    await page.locator('[data-testid="save"]').click({ force: true });
    await expect(page.locator('[data-testid="out"]')).toHaveText("Saved Grace");

    const state = await page.evaluate(() => window.__figment.host.state());
    expect(state.metrics.inputCaptures).toBeGreaterThan(0);
  });

  test("same-value attribute writes are ignored by the mutation filter", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const before = await page.evaluate(
      () => window.__figment.host.state().metrics.mutationsIgnored,
    );
    await page.evaluate(() => {
      const form = document.getElementById("profile")!;
      form.setAttribute("class", "same");
      form.setAttribute("class", "same");
      form.setAttribute("data-noise", "1");
    });
    // allow mutation observer + rAF to flush
    await page.waitForTimeout(100);
    const after = await page.evaluate(
      () => window.__figment.host.state().metrics.mutationsIgnored,
    );
    expect(after).toBeGreaterThan(before);
  });

  test("nested canvas is marked drawable while host is active", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);
    const marked = await page.evaluate(() => {
      const form = document.getElementById("profile")!;
      const c = form.querySelector("canvas")!;
      return c.getAttribute("content");
    });
    expect(marked).toBe("drawable");
  });

  test("geometry unit scale tracks the canvas grid", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);
    const state = await page.evaluate(() => window.__figment.host.state());
    expect(state.canvasGrid.x).toBeGreaterThan(0);
    expect(state.unitScale.x).toBeGreaterThan(0);
    const conv = await page.evaluate(() =>
      window.__figment.host.cssToCanvas(10, "x"),
    );
    expect(conv).toBeCloseTo(10 * state.unitScale.x, 5);
  });
});
