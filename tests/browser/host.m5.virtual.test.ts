import { expect, test } from "@playwright/test";

/**
 * M5a acceptance: windowed virtual list/grid — 10k rows stay fast
 * (only visible rows in the DOM).
 */

test.describe("M5a virtual list + grid", () => {
  test("virtual list windows 10k rows", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerVirtualList();

      const list = document.createElement("figment-virtual-list") as HTMLElement & {
        setCount: (n: number) => void;
        setLabels: (l: string[]) => void;
        setRowHeight: (h: number) => void;
        visibleRange: () => { start: number; end: number };
        renderedCount: () => number;
        count: number;
        rowHeight: number;
      };
      list.style.cssText = "width:320px;height:240px;position:fixed;left:0;top:0;";
      document.body.append(list);

      const labels = Array.from({ length: 10_000 }, (_, i) => `Row ${i + 1}`);
      list.setLabels(labels);
      list.setRowHeight(32);

      const renderedTop = list.renderedCount();
      const rangeTop = list.visibleRange();

      // Scroll to the middle — window should follow, DOM count stays small.
      list.scrollTop = 5_000 * 32;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const renderedMid = list.renderedCount();
      const rangeMid = list.visibleRange();

      const total = list.count;
      const rowH = list.rowHeight;
      list.remove();

      return {
        total,
        rowH,
        renderedTop,
        renderedMid,
        rangeTop,
        rangeMid,
      };
    });

    expect(result.total).toBe(10_000);
    expect(result.rowH).toBe(32);
    // Windowed: far fewer DOM nodes than 10k.
    expect(result.renderedTop).toBeLessThan(40);
    expect(result.renderedMid).toBeLessThan(40);
    expect(result.renderedMid).toBeGreaterThan(4);
    // Mid-scroll range is around row 5000.
    expect(result.rangeMid.start).toBeGreaterThan(4_800);
    expect(result.rangeMid.start).toBeLessThan(5_200);
  });

  test("virtual grid windows a large matrix", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerVirtualGrid();

      const grid = document.createElement("figment-virtual-grid") as HTMLElement & {
        setSize: (s: { rows: number; cols: number }) => void;
        setCellSize: (w: number, h: number) => void;
        visibleWindow: () => { r0: number; r1: number; c0: number; c1: number };
        renderedCount: () => number;
        size: { rows: number; cols: number };
      };
      grid.style.cssText = "width:400px;height:300px;position:fixed;left:0;top:0;";
      document.body.append(grid);

      grid.setSize({ rows: 500, cols: 200 });
      grid.setCellSize(120, 28);
      const n0 = grid.renderedCount();
      const w0 = grid.visibleWindow();

      grid.scrollTop = 200 * 28;
      grid.scrollLeft = 100 * 120;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const n1 = grid.renderedCount();
      const w1 = grid.visibleWindow();

      const size = grid.size;
      grid.remove();
      return { n0, n1, w0, w1, size };
    });

    expect(result.size.rows).toBe(500);
    expect(result.size.cols).toBe(200);
    // Windowed: tiny fraction of 100k cells.
    expect(result.n0).toBeLessThan(300);
    expect(result.n1).toBeLessThan(300);
    expect(result.n1).toBeGreaterThan(20);
    expect(result.w1.r0).toBeGreaterThan(180);
    expect(result.w1.c0).toBeGreaterThan(80);
  });
});
