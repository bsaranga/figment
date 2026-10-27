import { expect, test } from "@playwright/test";

/**
 * M3c acceptance: defineEffect from app code, compile-then-publish,
 * custom effect demoable on the composite layer.
 */

test.describe("M3c defineEffect", () => {
  test("app-defined effect runs in the composite pass", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      gpu.clearEffects();

      // App code defines a custom effect (frozen color schema).
      const compiled = gpu.defineEffect({
        id: "redOnly",
        wgsl: "vec4(c.r, 0.0, 0.0, c.a)",
        params: [],
      });

      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 64;
      canvas.setAttribute("content", "drawable");
      canvas.style.cssText = "width:96px;height:64px;position:fixed;left:0;top:0;";
      document.body.append(canvas);

      const el = document.createElement("div");
      el.style.cssText = "width:64px;height:48px;background:#20c040;"; // green
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

      composite.draw({
        width: 96,
        height: 64,
        layers: [
          {
            element: el,
            x: 8,
            y: 8,
            width: 64,
            height: 48,
            effects: [{ kind: "custom", id: "redOnly", params: {} }],
          },
        ],
      });

      const gl = canvas.getContext("webgl");
      const px = new Uint8Array(96 * 64 * 4);
      gl!.readPixels(0, 0, 96, 64, gl!.RGBA, gl!.UNSIGNED_BYTE, px);
      // Find a lit pixel — should be red-dominant (green suppressed).
      let found: { r: number; g: number; b: number } | null = null;
      for (let i = 0; i < px.length; i += 4) {
        if ((px[i + 3] ?? 0) > 200) {
          found = { r: px[i]!, g: px[i + 1]!, b: px[i + 2]! };
          break;
        }
      }

      // Baseline without custom (green card).
      composite.draw({
        width: 96,
        height: 64,
        layers: [{ element: el, x: 8, y: 8, width: 64, height: 48 }],
      });
      const px2 = new Uint8Array(96 * 64 * 4);
      gl!.readPixels(0, 0, 96, 64, gl!.RGBA, gl!.UNSIGNED_BYTE, px2);
      let base: { r: number; g: number; b: number } | null = null;
      for (let i = 0; i < px2.length; i += 4) {
        if ((px2[i + 3] ?? 0) > 200) {
          base = { r: px2[i]!, g: px2[i + 1]!, b: px2[i + 2]! };
          break;
        }
      }

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        compiledId: compiled.id,
        hasGlsl: compiled.glsl.includes("figmentCustom_redOnly"),
        customPixel: found,
        basePixel: base,
      };
    });

    expect(result.compiledId).toBe("redOnly");
    expect(result.hasGlsl).toBe(true);
    expect(result.customPixel).not.toBeNull();
    expect(result.basePixel).not.toBeNull();
    // Custom redOnly: R high, G low. Baseline green: G high.
    expect(result.customPixel!.r).toBeGreaterThan(result.customPixel!.g);
    expect(result.basePixel!.g).toBeGreaterThan(result.basePixel!.r);
  });

  test("undefined custom id fails fast at draw", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const err = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      gpu.clearEffects();
      try {
        gpu.validateEffectChain([
          { kind: "custom", id: "nope", params: {} },
        ]);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(err).toMatch(/not defined/i);
  });
});
