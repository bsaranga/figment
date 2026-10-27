import { expect, test } from "@playwright/test";

/**
 * M3g acceptance: emitters / pointer light move **without recapture**.
 * Changing light position updates pixels from the same texture.
 */

test.describe("M3g emitters + pointer light", () => {
  test("moving a light changes pixels without re-uploading the element", async ({
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
      canvas.width = 96;
      canvas.height = 96;
      canvas.setAttribute("content", "drawable");
      canvas.style.cssText = "width:96px;height:96px;position:fixed;left:0;top:0;";
      document.body.append(canvas);

      const el = document.createElement("div");
      el.style.cssText = "width:80px;height:80px;background:#404040;";
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
        const px = new Uint8Array(96 * 96 * 4);
        gl.readPixels(0, 0, 96, 96, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      };
      const lumAt = (px: Uint8Array, x: number, y: number) => {
        const gy = 96 - 1 - y;
        const i = (gy * 96 + x) * 4;
        return 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0);
      };

      // Light on the left.
      composite.draw({
        width: 96,
        height: 96,
        layers: [
          {
            element: el,
            x: 8,
            y: 8,
            width: 80,
            height: 80,
            emitters: [
              { id: "l", x: 0.15, y: 0.5, r: 1, g: 0.9, b: 0.7, intensity: 1.2, radius: 0.5 },
            ],
          },
        ],
      });
      const left = read();

      // Same texture, light on the right (no DOM mutation → no recapture).
      composite.draw({
        width: 96,
        height: 96,
        layers: [
          {
            element: el,
            x: 8,
            y: 8,
            width: 80,
            height: 80,
            emitters: [
              { id: "l", x: 0.85, y: 0.5, r: 1, g: 0.9, b: 0.7, intensity: 1.2, radius: 0.5 },
            ],
          },
        ],
      });
      const right = read();

      const leftL = lumAt(left, 30, 48);
      const leftR = lumAt(left, 70, 48);
      const rightL = lumAt(right, 30, 48);
      const rightR = lumAt(right, 70, 48);

      composite.dispose();
      el.remove();
      canvas.remove();

      return {
        leftBrighterOnLeft: leftL - leftR,
        rightBrighterOnRight: rightR - rightL,
        flip: leftL - leftR + (rightR - rightL),
      };
    });

    // Light on left → left side brighter than right.
    expect(result.leftBrighterOnLeft).toBeGreaterThan(2);
    // Light on right → right side brighter (same capture, new light).
    expect(result.rightBrighterOnRight).toBeGreaterThan(2);
    // Combined flip is clearly visible.
    expect(result.flip).toBeGreaterThan(4);
  });

  test("pointerEmitter + setEmitters are exposed", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      const p = gpu.pointerEmitter(0.3, 0.7, 1.1);
      const list = gpu.setEmitters("x", [p]);
      return {
        id: list[0]?.id,
        intensity: list[0]?.intensity,
        max: gpu.MAX_EMITTERS,
      };
    });
    expect(ok.id).toBe("pointer");
    expect(ok.intensity).toBeCloseTo(1.1, 5);
    expect(ok.max).toBe(4);
  });
});
