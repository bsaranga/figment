import { expect, test } from "@playwright/test";

/**
 * M3a acceptance: composite per-layer pass with direct GPU upload.
 * No staging 2D — texElementSubImage2D straight into pre-allocated textures.
 */

test.describe("M3a GPU composite", () => {
  test("direct WebGL composite draws layers and applies effect chain", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      // Load composite from the gpu package via the vite graph.
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 220;
      canvas.setAttribute("content", "drawable");
      canvas.style.cssText =
        "width:320px;height:220px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
      document.body.append(canvas);

      const el = document.createElement("div");
      el.id = "composite-card";
      el.style.cssText =
        "width:160px;height:100px;background:#c23f53;color:#fff;font:14px system-ui;";
      el.textContent = "card";
      // Must be a descendant of the drawable canvas (texElementSubImage2D contract).
      canvas.append(el);
      el.setAttribute("drawable", "");

      // Wait for a paint record before the first texElementSubImage2D.
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 500);
        canvas.addEventListener(
          "paint",
          () => {
            clearTimeout(t);
            resolve();
          },
          { once: true },
        );
        (canvas as HTMLCanvasElement & { requestPaint?: () => void }).requestPaint?.();
      });

      const composite = gpu.createDirectComposite(canvas);
      const kind = composite.kind;

      const drawn = composite.draw({
        width: 320,
        height: 220,
        layers: [
          {
            element: el,
            x: 40,
            y: 40,
            width: 160,
            height: 100,
            opacity: 1,
            effects: [
              { kind: "ripple", amplitude: 0.1 },
              { kind: "chromatic", offset: 0.05 },
            ],
          },
        ],
      });

      // Over-budget chain must throw (shader budget).
      let budgetError: string | null = null;
      try {
        composite.draw({
          width: 320,
          height: 220,
          layers: [
            {
              element: el,
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              effects: [
                { kind: "ripple", amplitude: 1 },
                { kind: "ripple", amplitude: 1 },
                { kind: "ripple", amplitude: 1 },
                { kind: "ripple", amplitude: 1 },
              ],
            },
          ],
        });
      } catch (e) {
        budgetError = (e as Error).message;
      }

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        kind: composite.kind,
        drawn,
        budgetError,
      };
    });

    expect(result.kind).toBe("webgl");
    expect(result.drawn).toBe(1);
    expect(result.budgetError).toMatch(/shader budget|exceeds/i);
  });

  test("validateEffectChain is exposed for apps", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const n = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return gpu.MAX_EFFECT_OPS;
    });
    expect(n).toBe(3);
  });
});
