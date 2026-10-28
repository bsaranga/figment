import { expect, test } from "@playwright/test";

/**
 * M5f acceptance: game-hud vertical — HTML-in-Canvas HUD, live metrics,
 * emitters preview, PNG export.
 */

test.describe("M5f game-hud vertical", () => {
  test("HUD is live HTML in drawable canvas with AT metrics", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5181/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 20_000 });

    const info = await page.evaluate(async () => {
      const host = window.__gameHud.getHost()!;
      await host.paintOnce();
      const s = host.state();
      return {
        backend: s.backend,
        paints: s.metrics.paints,
        layers: s.layers.map((l) => l.id),
        hp: window.__gameHud.getHp(),
      };
    });

    expect(info.backend).toBe("2d");
    expect(info.paints).toBeGreaterThan(0);
    expect(info.layers).toEqual(
      expect.arrayContaining(["game-hud", "quest-panel"]),
    );

    // Damage updates HP and reports (live region path).
    await page.click("#btn-damage");
    await expect(page.locator("#status")).toContainText("HP 88");
    const hp = await page.evaluate(() => window.__gameHud.getHp());
    expect(hp).toBe(88);

    // HUD pause control is a real button (keyboard/AT).
    await page.locator('[data-testid="hud-pause"]').focus();
    await expect(page.locator('[data-testid="hud-pause"]')).toBeFocused();
  });

  test("emitters relight without recapture + export PNG", async ({ page }) => {
    await page.goto("http://127.0.0.1:5181/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 20_000 });

    await page.locator("#light-preview").dispatchEvent("pointermove", {
      clientX: 80,
      clientY: 60,
    });
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const out = await page.evaluate(async () => {
      const host = window.__gameHud.getHost()!;
      const blob = await host.exportPng();
      return {
        kind: window.__gameHud.getComposite()?.kind,
        size: blob.size,
        type: blob.type,
      };
    });
    expect(out.kind).toBe("webgl");
    expect(out.type).toBe("image/png");
    expect(out.size).toBeGreaterThan(500);
  });
});
