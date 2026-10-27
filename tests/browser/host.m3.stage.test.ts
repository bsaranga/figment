import { expect, test } from "@playwright/test";

/**
 * M3e acceptance: stage material is a decorative ground (tint + vignette + grain).
 */

test.describe("M3e stage material", () => {
  test("stage ground tints and vignettes a layer", async ({ page }) => {
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

      const el = document.createElement("div");
      el.style.cssText = "width:96px;height:64px;background:#4060c0;";
      el.setAttribute("aria-hidden", "true");
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
      const sample = (px: Uint8Array, x: number, y: number) => {
        const gy = 96 - 1 - y;
        const i = (gy * 128 + x) * 4;
        return {
          r: px[i] ?? 0,
          g: px[i + 1] ?? 0,
          b: px[i + 2] ?? 0,
          a: px[i + 3] ?? 0,
        };
      };

      composite.draw({
        width: 128,
        height: 96,
        layers: [{ element: el, x: 16, y: 16, width: 96, height: 64 }],
      });
      const base = read();

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
            material: {
              kind: "stage",
              tint: "#806040",
              vignette: 0.7,
              grain: 0.05,
            },
          },
        ],
      });
      const staged = read();

      // Center of panel: base is blue; stage pulls toward warm tint.
      const cBase = sample(base, 64, 48);
      const cStage = sample(staged, 64, 48);
      // Corner-ish of panel: stronger vignette darkens.
      const eBase = sample(base, 20, 20);
      const eStage = sample(staged, 20, 20);

      const lum = (c: { r: number; g: number; b: number }) =>
        0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        baseCenter: cBase,
        stageCenter: cStage,
        baseCenterLum: lum(cBase),
        stageCenterLum: lum(cStage),
        edgeLumDrop: lum(eBase) - lum(eStage),
      };
    });

    expect(result.stageCenter.a).toBeGreaterThan(200);
    // Tint shifts hue: stage center is warmer (more red, less blue) than base.
    expect(result.stageCenter.r).toBeGreaterThan(result.baseCenter.r - 5);
    expect(result.stageCenter.b).toBeLessThan(result.baseCenter.b);
    // Vignette darkens edges.
    expect(result.edgeLumDrop).toBeGreaterThan(0);
  });

  test("resolveStage is exposed for apps", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const v = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return gpu.resolveStage({ kind: "stage", vignette: 0.3 }).vignette;
    });
    expect(v).toBeCloseTo(0.3, 5);
  });
});
