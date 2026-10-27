import { expect, test } from "@playwright/test";

/**
 * M2d acceptance: hit-test stack (preserveHitTestOrder) + canvasClip.
 * Overlapping panels click the topmost layer; clip rejects hits outside.
 */

test.describe("M2d hit stack + clip", () => {
  test("overlapping layers: topmost wins, background redraw does not steal clicks", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 320;
      stage.height = 200;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:320px;height:200px;position:fixed;left:0;top:0;z-index:2147483000;";
      document.body.append(stage);

      const mk = (id: string, color: string) => {
        const el = document.createElement("button");
        el.id = id;
        el.dataset.testid = id;
        el.textContent = id;
        el.style.cssText = `position:absolute;left:40px;top:40px;width:120px;height:80px;background:${color};border:0;font:14px system-ui;`;
        stage.append(el);
        return el;
      };

      const back = mk("back", "#224466");
      const front = mk("front", "#c23f53");

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);

      const backLayer = host.layer(back, {
        id: "back",
        drawAt: { x: 40, y: 40 },
        preserveHitTestOrder: true,
      });
      const frontLayer = host.layer(front, {
        id: "front",
        drawAt: { x: 40, y: 40 },
        preserveHitTestOrder: true,
      });
      await host.paintOnce();

      const clickCenter = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        return hit?.id || hit?.tagName.toLowerCase() || null;
      };

      const steps: Record<string, unknown> = {
        topmost: clickCenter(front),
        geometryUpdates: host.state().metrics.geometryUpdates,
      };

      // Background redraw must NOT steal the hit (preserveHitTestOrder).
      backLayer.invalidate();
      await host.paintOnce();
      steps.afterBackRedraw = clickCenter(front);

      // Dispose top layer → bottom becomes the hit target.
      frontLayer.dispose();
      await host.paintOnce();
      steps.afterDisposeFront = clickCenter(back);
      steps.geometryClears = host.state().metrics.geometryClears;

      backLayer.dispose();
      await host.destroy();
      stage.remove();
      return steps;
    });

    expect(result.topmost).toBe("front");
    expect(result.afterBackRedraw).toBe("front");
    expect(result.afterDisposeFront).toBe("back");
    expect(result.geometryUpdates as number).toBeGreaterThan(0);
    expect(result.geometryClears as number).toBeGreaterThanOrEqual(1);
  });

  test("canvasClip: hits outside the clip rect miss the layer", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 320;
      stage.height = 200;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:320px;height:200px;position:fixed;left:0;top:0;z-index:2147483000;";
      document.body.append(stage);

      const el = document.createElement("button");
      el.id = "clipped";
      el.textContent = "clipped";
      // 160×80 button at (40,40) — we clip to the left half only.
      el.style.cssText =
        "position:absolute;left:40px;top:40px;width:160px;height:80px;background:#c23f53;border:0;";
      stage.append(el);

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);

      const layer = host.layer(el, {
        id: "clipped",
        drawAt: { x: 40, y: 40 },
        clip: new DOMRect(40, 40, 80, 80), // left half of the button box
        preserveHitTestOrder: true,
      });
      await host.paintOnce();

      const r = el.getBoundingClientRect();
      const idAtOffset = (dx: number, dy: number) =>
        document.elementFromPoint(r.left + dx, r.top + dy)?.id || null;

      // Inside clip (left half of button) vs outside clip (right half).
      const inside = idAtOffset(20, 20);
      const outside = idAtOffset(120, 20);

      // Shrink clip to a tiny box near the button origin.
      layer.setClip(new DOMRect(40, 40, 4, 4));
      await host.paintOnce();
      const afterShrinkInside = idAtOffset(20, 20);

      // Clear clip — full button hits again.
      layer.setClip(null);
      await host.paintOnce();
      const afterClear = idAtOffset(120, 20);

      layer.dispose();
      await host.destroy();
      stage.remove();
      return { inside, outside, afterShrinkInside, afterClear };
    });

    expect(result.inside).toBe("clipped");
    // Right half of the drawn button is outside canvasClip.
    expect(result.outside).not.toBe("clipped");
    expect(result.afterShrinkInside).not.toBe("clipped");
    expect(result.afterClear).toBe("clipped");
  });

  test("host.updateGeometry / clearGeometry are exposed and counted", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const stats = await page.evaluate(async () => {
      const host = window.__figment.host;
      const before = host.state().metrics.geometryUpdates;
      host.updateGeometry("profile", {
        canvasClip: new DOMRect(0, 0, 200, 200),
        preserveHitTestOrder: true,
      });
      const mid = host.state().metrics.geometryUpdates;
      host.clearGeometry("profile");
      return {
        before,
        mid,
        clears: host.state().metrics.geometryClears,
      };
    });

    expect(stats.mid).toBeGreaterThan(stats.before);
    expect(stats.clears).toBeGreaterThanOrEqual(1);
  });
});
