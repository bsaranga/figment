import { expect, test } from "@playwright/test";

/**
 * Promo page must ship real HTML-in-Canvas surfaces (not CSS-only).
 */

test.describe("promo live HTML-in-Canvas demos", () => {
  test("host + glass canvases boot in the browser", async ({ page }) => {
    await page.goto("http://127.0.0.1:5180/");
    await expect(page.locator("#promo-host-canvas")).toHaveCount(1);
    await expect(page.locator("#promo-glass-canvas")).toHaveCount(1);

    const attrs = await page.evaluate(() => {
      const host = document.getElementById("promo-host-canvas")!;
      const glass = document.getElementById("promo-glass-canvas")!;
      return {
        hostDrawable: host.getAttribute("content"),
        glassDrawable: glass.getAttribute("content"),
        hostTag: host.tagName,
      };
    });
    expect(attrs.hostTag).toBe("CANVAS");
    expect(attrs.hostDrawable).toBe("drawable");
    expect(attrs.glassDrawable).toBe("drawable");

    // Host demo should reach ok (HTML-in-Canvas admit + paint).
    await expect(page.locator("#promo-host-status")).toHaveClass(/ok/, {
      timeout: 15_000,
    });

    // Glass composite should also report live status.
    await expect(page.locator("#promo-glass-status")).toHaveClass(/ok/, {
      timeout: 20_000,
    });

    const info = await page.evaluate(() => {
      const demos = (window as unknown as {
        __promoDemos?: { host?: { host?: { state(): unknown } } | null };
      }).__promoDemos;
      return {
        hasHost: !!demos?.host?.host,
        painted: !!(
          demos?.host?.host &&
          (
            demos.host.host.state() as {
              metrics: { paints: number };
            }
          ).metrics.paints > 0
        ),
      };
    });
    expect(info.hasHost).toBe(true);
    expect(info.painted).toBe(true);
  });

  test("input inside drawable canvas is typeable", async ({ page }) => {
    await page.goto("http://127.0.0.1:5180/");
    await expect(page.locator("#promo-host-status")).toHaveClass(/ok/, {
      timeout: 15_000,
    });

    const input = page.locator("#promo-host-canvas").getByLabel("Demo input in canvas");
    await input.focus();
    await input.fill("GPU-native");
    await expect(input).toHaveValue("GPU-native");
  });
});
