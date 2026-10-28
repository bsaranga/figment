import { expect, test } from "@playwright/test";

/**
 * M5e acceptance: design-tool vertical runs on the real stack —
 * @figment/host (HTML-in-Canvas, exportPng) + @figment/gpu glass preview.
 */

test.describe("M5e design tool vertical (host + GPU)", () => {
  test("frames live in a drawable canvas via host", async ({ page }) => {
    await page.goto("http://127.0.0.1:5178/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 20_000 });

    const info = await page.evaluate(async () => {
      await window.__designTool.getHost()?.paintOnce();
      const host = window.__designTool.getHost()!;
      const s = host.state();
      return {
        backend: s.backend,
        health: s.health,
        paints: s.metrics.paints,
        layers: s.layers.map((l) => l.id),
        frameIds: window.__designTool.frames().map((f) => f.id),
        hasGlass: !!window.__designTool.getGlass(),
      };
    });

    expect(info.backend).toBe("2d");
    expect(info.health).toBe("healthy");
    expect(info.paints).toBeGreaterThan(0);
    expect(info.layers.length).toBeGreaterThanOrEqual(3);
    expect(info.hasGlass).toBe(true);
    expect(info.frameIds).toEqual(
      expect.arrayContaining(["brief", "tokens", "export"]),
    );

    // Real input inside the drawable stage is focusable.
    const input = page.locator('[data-testid="field-brief"]');
    await input.focus();
    await input.fill("shader-ready");
    await expect(input).toHaveValue("shader-ready");
  });

  test("exportPng ships a PNG of the surface", async ({ page }) => {
    await page.goto("http://127.0.0.1:5178/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 20_000 });

    const blob = await page.evaluate(async () => {
      const host = window.__designTool.getHost()!;
      const b = await host.exportPng();
      return { size: b.size, type: b.type };
    });
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(500);
  });

  test("glass preview is the GPU composite path", async ({ page }) => {
    await page.goto("http://127.0.0.1:5178/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 20_000 });

    const kind = await page.evaluate(() => {
      window.__designTool.drawGlassPreview();
      return window.__designTool.getGlass()?.kind;
    });
    expect(kind).toBe("webgl");

    // Pointer light on the preview must not throw (uniforms only).
    await page.locator("#glass-preview").dispatchEvent("pointermove", {
      clientX: 40,
      clientY: 40,
    });
    await expect(page.locator("#status")).toHaveClass(/ok/);
  });
});
