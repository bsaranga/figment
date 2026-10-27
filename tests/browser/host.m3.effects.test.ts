import { expect, test } from "@playwright/test";

/**
 * M3b acceptance: ripple, chromatic, dissolve are each demoable on a layer.
 * Each effect must change pixels vs the un-effected baseline.
 */

type EffectName = "ripple" | "chromatic" | "dissolve";

test.describe("M3b effects", () => {
  for (const effect of ["ripple", "chromatic", "dissolve"] as EffectName[]) {
    test(`${effect} changes pixels on a composite layer`, async ({ page }) => {
      await page.goto("/admission-probe.html");
      await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
        timeout: 10_000,
      });

      const result = await page.evaluate(async (kind: string) => {
        const gpu = await import(
          "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
        );

        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 120;
        canvas.setAttribute("content", "drawable");
        canvas.style.cssText = "width:160px;height:120px;position:fixed;left:0;top:0;";
        document.body.append(canvas);

        const el = document.createElement("div");
        el.style.cssText = [
          "width:120px;height:80px",
          // Gradient + solid so effects have structure to move.
          "background:linear-gradient(90deg,#ff0000,#00ff00,#0000ff)",
          "font:16px system-ui;color:#fff;padding:8px;box-sizing:border-box",
        ].join(";");
        el.textContent = "figment";
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

        const effects =
          kind === "ripple"
            ? [{ kind: "ripple", amplitude: 0.8, edge: 1 }]
            : kind === "chromatic"
              ? [{ kind: "chromatic", offset: 0.04 }]
              : [{ kind: "dissolve", progress: 0.45 }];

        const sample = () => {
          const gl = canvas.getContext("webgl")!;
          const w = canvas.width;
          const h = canvas.height;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          return px;
        };

        // Baseline (no effects).
        composite.draw({
          width: 160,
          height: 120,
          layers: [{ element: el, x: 10, y: 10, width: 120, height: 80, opacity: 1 }],
        });
        const before = sample();

        // With effect.
        composite.draw({
          width: 160,
          height: 120,
          layers: [
            {
              element: el,
              x: 10,
              y: 10,
              width: 120,
              height: 80,
              opacity: 1,
              effects: effects as never,
            },
          ],
        });
        const after = sample();

        let diff = 0;
        for (let i = 0; i < before.length; i += 4) {
          const d =
            Math.abs((before[i] ?? 0) - (after[i] ?? 0)) +
            Math.abs((before[i + 1] ?? 0) - (after[i + 1] ?? 0)) +
            Math.abs((before[i + 2] ?? 0) - (after[i + 2] ?? 0)) +
            Math.abs((before[i + 3] ?? 0) - (after[i + 3] ?? 0));
          if (d > 8) diff++;
        }

        composite.dispose();
        el.remove();
        canvas.remove();
        return { kind, diff };
      }, effect);

      expect(result.diff, `${effect} should change >0 pixels`).toBeGreaterThan(0);
    });
  }
});
