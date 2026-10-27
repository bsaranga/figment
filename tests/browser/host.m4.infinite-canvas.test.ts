import { expect, test } from "@playwright/test";

/**
 * M4c acceptance: infinite canvas pans and zooms in world space;
 * panels sit on the board.
 */

test.describe("M4c infinite canvas", () => {
  test("pan and zoom transform the world layer", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerInfiniteCanvas();
      ui.registerSpatialPanel();

      const board = document.createElement("figment-infinite-canvas") as HTMLElement & {
        view: { x: number; y: number; scale: number };
        clientToWorld: (x: number, y: number) => { x: number; y: number };
        zoomAt: (x: number, y: number, s: number) => void;
        fitWorld: (r: { x: number; y: number; width: number; height: number }) => void;
      };
      board.style.cssText = "width:600px;height:400px;position:fixed;left:0;top:0;";
      document.body.append(board);

      const panel = document.createElement("figment-spatial-panel") as HTMLElement;
      panel.innerHTML = `<span slot="title">Node</span><p>On the board</p>`;
      panel.style.left = "120px";
      panel.style.top = "80px";
      board.append(panel);

      const world = board.shadowRoot!.querySelector(".world") as HTMLElement;

      // Initial view
      const v0 = board.view;

      // Programmatic pan
      board.view = { x: 50, y: -30, scale: 1.2 };
      const v1 = board.view;
      const t1 = world.style.transform;

      // Wheel zoom (deltaY < 0 zooms in) about (100, 100)
      const before = board.view.scale;
      board.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -120,
          clientX: 100,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        }),
      );
      const after = board.view.scale;

      // clientToWorld maps through the view
      board.view = { x: 0, y: 0, scale: 2 };
      const w = board.clientToWorld(100, 100);
      const rect = board.getBoundingClientRect();
      const expectedX = (100 - rect.left) / 2;

      // fitWorld
      board.fitWorld({ x: 0, y: 0, width: 200, height: 100 }, 20);
      const fit = board.view;

      board.remove();

      return {
        v0,
        v1,
        t1,
        zoomedIn: after > before,
        w,
        expectedX,
        fitScale: fit.scale,
        panelTag: panel.tagName.toLowerCase(),
      };
    });

    expect(result.panelTag).toBe("figment-spatial-panel");
    expect(result.v0.scale).toBeCloseTo(1, 5);
    expect(result.v1.x).toBeCloseTo(50, 5);
    expect(result.v1.scale).toBeCloseTo(1.2, 5);
    expect(result.t1).toContain("translate(50px, -30px)");
    expect(result.t1).toContain("scale(1.2)");
    expect(result.zoomedIn).toBe(true);
    expect(result.w.x).toBeCloseTo(result.expectedX, 3);
    expect(result.fitScale).toBeGreaterThan(0);
  });

  test("registerInfiniteCanvas is exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      return typeof ui.registerInfiniteCanvas === "function";
    });
    expect(ok).toBe(true);
  });
});
