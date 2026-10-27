import { expect, test } from "@playwright/test";

/**
 * M1l acceptance: React owns the form DOM and enrolls it in the host.
 * Same interaction contract as vanilla-mount.
 */

test.describe("react mount", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://127.0.0.1:5174/");
    await expect(page.locator("#status")).toHaveClass(/ok/);
  });

  test("mounts a React-owned form layer and reports healthy state", async ({
    page,
  }) => {
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

    const framework = await page.evaluate(() => window.__figment.framework);
    expect(framework).toBe("react");
  });

  test("typing in the React form updates output and paint metrics", async ({
    page,
  }) => {
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

  test("nested canvas is marked drawable under the React layer", async ({
    page,
  }) => {
    const marked = await page.evaluate(() => {
      const form = document.getElementById("profile")!;
      const c = form.querySelector("canvas")!;
      return c.getAttribute("content");
    });
    expect(marked).toBe("drawable");
  });
});
