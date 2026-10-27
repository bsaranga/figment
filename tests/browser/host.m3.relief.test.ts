import { expect, test } from "@playwright/test";

/**
 * M3d acceptance: relief material gives panel depth; text contrast holds.
 */

test.describe("M3d relief material", () => {
  test("relief shades edges (depth) without destroying center brightness", async ({
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
      canvas.height = 96;
      canvas.setAttribute("content", "drawable");
      canvas.style.cssText = "width:128px;height:96px;position:fixed;left:0;top:0;";
      document.body.append(canvas);

      // Mid-gray panel + dark text so contrast can be measured.
      const el = document.createElement("div");
      el.style.cssText = [
        "width:96px;height:64px",
        "background:#808080",
        "color:#101010",
        "font:16px system-ui;font-weight:600",
        "padding:12px;box-sizing:border-box",
      ].join(";");
      el.textContent = "Aa";
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

      const read = () => {
        const gl = canvas.getContext("webgl")!;
        const px = new Uint8Array(128 * 96 * 4);
        gl.readPixels(0, 0, 128, 96, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      };

      // Baseline (no material).
      composite.draw({
        width: 128,
        height: 96,
        layers: [{ element: el, x: 16, y: 16, width: 96, height: 64 }],
      });
      const base = read();

      // Relief material.
      composite.draw({
        width: 128,
        height: 96,
        layers: [
          {
            element: el,
            x: 16,
            y: 16,
            width: 96,
            height: 64,
            material: { kind: "relief", bevel: 0.18, depth: 0.6 },
          },
        ],
      });
      const relief = read();

      const sample = (px: Uint8Array, x: number, y: number) => {
        // GL readPixels origin is bottom-left; convert from top-left canvas px.
        const gy = 96 - 1 - y;
        const i = (gy * 128 + x) * 4;
        return {
          r: px[i] ?? 0,
          g: px[i + 1] ?? 0,
          b: px[i + 2] ?? 0,
          a: px[i + 3] ?? 0,
        };
      };

      // Near-border vs center of the panel (x,y in canvas space).
      const borderBase = sample(base, 18, 20);
      const borderRelief = sample(relief, 18, 20);
      const centerBase = sample(base, 64, 48);
      const centerRelief = sample(relief, 64, 48);

      const lum = (c: { r: number; g: number; b: number }) =>
        0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        borderBase: lum(borderBase),
        borderRelief: lum(borderRelief),
        centerBase: lum(centerBase),
        centerRelief: lum(centerRelief),
        borderA: borderRelief.a,
      };
    });

    expect(result.borderA).toBeGreaterThan(200);
    // Edge shading changes brightness (panel has depth).
    expect(Math.abs(result.borderRelief - result.borderBase)).toBeGreaterThan(1);
    // Center stays close to baseline (text contrast holds — no crushing).
    expect(Math.abs(result.centerRelief - result.centerBase)).toBeLessThan(40);
  });

  test("resolveRelief is exposed", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const brightness = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return gpu.resolveRelief({ kind: "relief", bevel: 0.2, depth: 0.5 }).brightness;
    });
    expect(brightness).toBeGreaterThan(0.87);
    expect(brightness).toBeLessThan(1.13);
  });
});
