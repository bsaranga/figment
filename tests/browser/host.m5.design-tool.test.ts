import { expect, test } from "@playwright/test";

/**
 * M5e acceptance: design-tool vertical is shippable — board, layers,
 * inspector, and PNG export.
 */

test.describe("M5e design tool vertical", () => {
  test("board + layers + inspector + export work together", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5178/");
    await expect(page.locator("header h1")).toContainText("design tool");
    await page.waitForFunction(() => !!window.__designTool);

    // Seeded frames
    const ids = await page.evaluate(() =>
      window.__designTool.frames().map((f) => f.id),
    );
    expect(ids).toEqual(expect.arrayContaining(["brief", "tokens", "export"]));

    // Layers list is windowed and labeled
    const layerCount = await page.evaluate(() => {
      const list = document.getElementById("layers") as HTMLElement & {
        renderedCount: () => number;
      };
      return list.renderedCount();
    });
    expect(layerCount).toBeGreaterThan(0);

    // Add frame via toolbar
    await page.click("#btn-add");
    const afterAdd = await page.evaluate(() => window.__designTool.frames().length);
    expect(afterAdd).toBe(4);

    // Inspector binds to selection (name field updated)
    await page.click("#insp-name");
    await page.fill("#insp-name", "hero-frame");
    await page.locator("#insp-name").press("Enter");
    const renamed = await page.evaluate(() =>
      window.__designTool.frames().some((f) => f.id === "hero-frame"),
    );
    expect(renamed).toBe(true);

    // Export PNG (download)
    const dl = page.waitForEvent("download");
    await page.click("#btn-export");
    const download = await dl;
    expect(download.suggestedFilename()).toContain("figment-design-tool");

    // ⌘K palette
    await page.keyboard.press("Meta+k");
    await expect(page.locator("#palette")).toHaveAttribute("open", "");
  });

  test("demo exposes __designTool", async ({ page }) => {
    await page.goto("http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__designTool);
    const ok = await page.evaluate(() => ({
      hasCanvas: !!window.__designTool.canvas,
      canAdd: typeof window.__designTool.addFrame === "function",
    }));
    expect(ok.hasCanvas).toBe(true);
    expect(ok.canAdd).toBe(true);
  });
});
