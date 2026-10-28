import { expect, test } from "@playwright/test";

/**
 * Vertical demo: real HTML-in-Canvas host + GPU glass refraction.
 * Must use createHost/admit/layer/exportPng and createDirectComposite.
 */

test.describe("M5 html-in-canvas + glass demo", () => {
  test("host runtime admits and paints live HTML in drawable canvas", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5179/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 15_000 });

    const hostInfo = await page.evaluate(async () => {
      await window.__glassSurface.bootHost();
      const host = window.__glassSurface.getHost();
      const s = host!.state();
      return {
        backend: s.backend,
        health: s.health,
        paints: s.metrics.paints,
        layers: s.layers.map((l) => l.id),
        admission: s.admission?.pixel.ok ?? false,
      };
    });

    expect(hostInfo.backend).toBe("2d");
    expect(hostInfo.health).toBe("healthy");
    expect(hostInfo.paints).toBeGreaterThan(0);
    expect(hostInfo.layers).toEqual(
      expect.arrayContaining(["host-panel", "host-strip"]),
    );
    expect(hostInfo.admission).toBe(true);

    // Real input inside the host drawable canvas is focusable.
    const input = page.locator('#host-stage').getByTestId("project");
    await input.focus();
    await input.fill("Nebula");
    await expect(input).toHaveValue("Nebula");
  });

  test("glass composite draws refraction and pointer light", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5179/", { waitUntil: "networkidle" });
    // Warm-up: let auto-boot finish (or recover on pointer draw).
    await page.waitForTimeout(1500);
    await page.locator("#glass-stage").dispatchEvent("pointermove", {
      clientX: 120,
      clientY: 80,
    });
    await page.waitForTimeout(500);
    const statusText = await page.locator("#glass-status").textContent();
    if (!/ready|light @/.test(statusText ?? "")) {
      throw new Error(`glass status: ${statusText}`);
    }
    // Pointer light on the glass surface (draw must succeed — no recapture).
    const stage = page.locator("#glass-stage");
    const box = await stage.boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35);
    await expect(page.locator("#glass-status")).toContainText("light @");

    const glass = await page.evaluate(() => {
      const composite = window.__glassSurface.getComposite();
      return { kind: composite?.kind };
    });
    expect(glass.kind).toBe("webgl");
  });

  test("export PNG from host surface", async ({ page }) => {
    await page.goto("http://127.0.0.1:5179/");
    await expect(page.locator("#status")).toHaveClass(/ok/, { timeout: 15_000 });

    const size = await page.evaluate(async () => {
      const host = window.__glassSurface.getHost()!;
      const blob = await host.exportPng();
      return { size: blob.size, type: blob.type };
    });
    expect(size.type).toBe("image/png");
    expect(size.size).toBeGreaterThan(500);
  });
});
