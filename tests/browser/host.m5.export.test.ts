import { expect, test } from "@playwright/test";

/**
 * M5d acceptance: paintOnce() → PNG export of a live scene.
 */

test.describe("M5d PNG export", () => {
  test("exportPng returns a non-empty PNG of a drawn layer", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 240;
      stage.height = 160;
      stage.setAttribute("content", "drawable");
      stage.style.cssText = "width:240px;height:160px;position:fixed;left:0;top:0;";
      document.body.append(stage);

      const card = document.createElement("div");
      card.style.cssText =
        "width:160px;height:100px;background:#c23f53;color:#fff;font:14px system-ui;padding:8px;box-sizing:border-box;";
      card.textContent = "export me";
      stage.append(card);
      card.setAttribute("drawable", "");

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      host.layer(card, {
        id: "card",
        drawAt: { x: 20, y: 20 },
      });

      const blob = await host.exportPng();
      const dataUrl = host.exportDataUrl("image/png");

      // Decode PNG dimensions from header.
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const sig = Array.from(bytes.slice(0, 4)).join(",");
      // PNG signature: 137 80 78 71
      const isPng = sig === "137,80,78,71";
      // IHDR: 8-byte sig + 4 len + 4 type → width at 16, height at 20 (BE u32)
      const ihdrW =
        (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
      const ihdrH =
        (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;

      await host.destroy();
      stage.remove();

      return {
        size: blob.size,
        type: blob.type,
        isPng,
        ihdrW,
        ihdrH,
        dataUrlPrefix: dataUrl.slice(0, 22),
      };
    });

    expect(result.isPng).toBe(true);
    expect(result.type).toBe("image/png");
    expect(result.size).toBeGreaterThan(200);
    expect(result.ihdrW).toBe(240);
    expect(result.ihdrH).toBe(160);
    expect(result.dataUrlPrefix).toContain("data:image/png");
  });

  test("host state stays healthy after export", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const after = await page.evaluate(async () => {
      const host = window.__figment.host;
      const blob = await host.exportPng();
      const s = host.state();
      return {
        size: blob.size,
        health: s.health,
        paints: s.metrics.paints,
      };
    });

    expect(after.size).toBeGreaterThan(200);
    expect(after.health).toBe("healthy");
    expect(after.paints).toBeGreaterThan(0);
  });
});
