import { expect, test } from "@playwright/test";

/**
 * M4h acceptance: spatial-shell demo — Figma-like board with the kit.
 */

test.describe("M4h spatial shell demo", () => {
  test("board boots with panels, minimap, and ⌘K", async ({ page }) => {
    await page.goto("http://127.0.0.1:5175/");
    await expect(page.locator("header h1")).toContainText("spatial shell");

    // Seeded panels on the board.
    const panels = page.locator("figment-spatial-panel");
    await expect(panels).toHaveCount(3);

    // Minimap is present and drawn.
    const painted = await page.evaluate(() => {
      const map = document.querySelector("figment-minimap")!;
      const canvas = map.shadowRoot!.querySelector("canvas") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let n = 0;
      for (let i = 3; i < px.length; i += 4) if ((px[i] ?? 0) > 0) n++;
      return n;
    });
    expect(painted).toBeGreaterThan(0);

    // ⌘K opens palette.
    await page.keyboard.press("Meta+k");
    const open = await page.evaluate(
      () => document.getElementById("palette")!.hasAttribute("open"),
    );
    expect(open).toBe(true);

    // Fit command works.
    await page.evaluate(() => {
      const pal = document.getElementById("palette") as HTMLElement & {
        setCommands: (c: unknown[]) => void;
        open: () => void;
        confirm: () => unknown;
      };
      pal.setCommands([{ id: "fit", label: "Fit board" }]);
      pal.open();
      pal.confirm();
    });
    const scale = await page.evaluate(
      () =>
        (
          document.getElementById("canvas") as HTMLElement & {
            view: { scale: number };
          }
        ).view.scale,
    );
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(2);
  });

  test("demo exposes __spatialShell for tests", async ({ page }) => {
    await page.goto("http://127.0.0.1:5175/");
    await page.waitForFunction(() => !!window.__spatialShell);
    const ids = await page.evaluate(() => {
      const stack = document.getElementById("stack")!;
      return [...stack.children].map((c) => c.id);
    });
    expect(ids).toEqual(expect.arrayContaining(["brief", "tokens", "kit"]));
  });
});
