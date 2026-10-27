import { expect, test } from "@playwright/test";

/**
 * M3h acceptance: copy stays readable under strong light.
 * Protected text rects clamp light so text contrast never collapses.
 */

test.describe("M3h protected text", () => {
  test("strong light washes out unprotected areas but not protected copy", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );

      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      canvas.setAttribute("content", "drawable");
      canvas.style.cssText = "width:128px;height:64px;position:fixed;left:0;top:0;";
      document.body.append(canvas);

      // Two text bands: top protected, bottom not. Mid-gray + dark glyphs.
      const el = document.createElement("div");
      el.style.cssText = [
        "width:112px;height:48px",
        "background:#606060",
        "color:#000",
        "font:14px system-ui;font-weight:700",
        "display:flex;flex-direction:column;justify-content:space-between",
        "padding:4px;box-sizing:border-box",
      ].join(";");
      el.innerHTML = `<span>AB</span><span>CD</span>`;
      canvas.append(el);
      el.setAttribute("drawable", "");

      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 500);
        canvas.addEventListener("paint", () => {
          clearTimeout(t);
          resolve();
        }, { once: true });
        (canvas as HTMLCanvasElement & { requestPaint?: () => void }).requestPaint?.();
      });

      const composite = gpu.createDirectComposite(canvas);

      const draw = (
        protect?: {
          x: number;
          y: number;
          width: number;
          height: number;
          strength?: number;
        }[],
      ) => {
        composite.draw({
          width: 128,
          height: 64,
          layers: [
            {
              element: el,
              x: 8,
              y: 8,
              width: 112,
              height: 48,
              emitters: [
                {
                  id: "sun",
                  x: 0.5,
                  y: 0.5,
                  r: 1,
                  g: 1,
                  b: 1,
                  intensity: 3,
                  radius: 1.2,
                },
              ],
              protectedText: protect,
            },
          ],
        });
        const gl = canvas.getContext("webgl")!;
        const px = new Uint8Array(128 * 64 * 4);
        gl.readPixels(0, 0, 128, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      };

      const lum = (px: Uint8Array, x: number, y: number) => {
        const gy = 64 - 1 - y;
        const i = (gy * 128 + x) * 4;
        return 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0);
      };

      // Strong light, no protect: top and bottom both blown out.
      const blown = draw();
      const blownTop = lum(blown, 64, 20);
      const blownBot = lum(blown, 64, 44);

      // Protect the top text band (UV of the layer).
      const safe = draw([{ x: 0, y: 0, width: 1, height: 0.45, strength: 1 }]);
      const safeTop = lum(safe, 64, 20);
      const safeBot = lum(safe, 64, 44);

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        blownTop,
        blownBot,
        safeTop,
        safeBot,
        topDrop: blownTop - safeTop,
        botStaysBlown: safeBot - safeTop,
      };
    });

    // Unprotected blowout happens under intensity 3.
    expect(result.blownTop).toBeGreaterThan(180);
    // Protected band is pulled back vs blown (readable).
    expect(result.topDrop).toBeGreaterThan(15);
    // Unprotected bottom stays hotter than protected top.
    expect(result.botStaysBlown).toBeGreaterThan(10);
  });

  test("setProtectedText is exposed", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const n = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return gpu.setProtectedText("t", [{ x: 0, y: 0, width: 1, height: 0.5 }]).length;
    });
    expect(n).toBe(1);
  });
});
