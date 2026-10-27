import { expect, test } from "@playwright/test";

/**
 * M3f acceptance: glass is refractive + readable.
 * Refraction bends sampling; tint applies; text-like contrast survives.
 */

test.describe("M3f glass material", () => {
  test("glass refracts and tints without crushing readability", async ({
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

      // High-contrast stripes so refraction is measurable.
      const el = document.createElement("div");
      el.style.cssText = [
        "width:96px;height:64px",
        "background:repeating-linear-gradient(90deg,#fff 0 8px,#000 8px 16px)",
        "color:#fff",
        "font:18px system-ui;font-weight:700",
        "display:flex;align-items:center;justify-content:center",
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
      const lum = (c: { r: number; g: number; b: number }) =>
        0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

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
              kind: "glass",
              ior: 1.4,
              tint: "#88ccff",
              dispersion: 0.5,
              frost: 0.3,
            },
          },
        ],
      });
      const glassed = read();

      // Sample a few points across the panel.
      const points = [
        [32, 32],
        [48, 40],
        [64, 48],
        [80, 40],
        [96, 48],
      ];
      let maxDiff = 0;
      let baseMin = 255;
      let baseMax = 0;
      let glassMin = 255;
      let glassMax = 0;
      for (const [x, y] of points) {
        const b = sample(base, x!, y!);
        const g = sample(glassed, x!, y!);
        const d =
          Math.abs(b.r - g.r) + Math.abs(b.g - g.g) + Math.abs(b.b - g.b);
        if (d > maxDiff) maxDiff = d;
        const bl = lum(b);
        const gl = lum(g);
        baseMin = Math.min(baseMin, bl);
        baseMax = Math.max(baseMax, bl);
        glassMin = Math.min(glassMin, gl);
        glassMax = Math.max(glassMax, gl);
      }

      // Center sample alpha must remain opaque (readable, not eaten).
      const center = sample(glassed, 64, 48);

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        maxDiff,
        baseRange: baseMax - baseMin,
        glassRange: glassMax - glassMin,
        centerA: center.a,
        centerR: center.r,
        centerB: center.b,
      };
    });

    // Refraction/dispersion/tint changes pixels.
    expect(result.maxDiff).toBeGreaterThan(10);
    // Stripe contrast is softened but not flattened (readable glass).
    expect(result.glassRange).toBeGreaterThan(result.baseRange * 0.25);
    // Content remains opaque.
    expect(result.centerA).toBeGreaterThan(200);
  });

  test("resolveGlass exposes refraction ceiling", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const r = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      const g = gpu.resolveGlass({ kind: "glass", ior: 2.5 });
      return { refraction: g.refraction, max: gpu.GLASS_REFRACTION_MAX };
    });
    expect(r.refraction).toBe(r.max);
  });
});
