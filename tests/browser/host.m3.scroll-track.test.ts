import { expect, test } from "@playwright/test";

/**
 * M3l acceptance: scroll flies panels through Z (scrub, not jank).
 * Scroll progress drives cameraZ / layer z channels.
 */

test.describe("M3l scrollTrack", () => {
  test("scroll progress scrubs cameraZ and layer z", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );

      // Build a scrollable page region with a tall spacer.
      const spacer = document.createElement("div");
      spacer.style.height = "2000px";
      document.body.append(spacer);

      let lastCam = 0;
      let lastZ = 0;
      const handle = gpu.scrollTrack(
        "camera",
        {
          source: "window",
          axis: "y",
          range: { start: 0, end: 1000 },
          channels: {
            cameraZ: { from: 0, to: -400 },
            z: { from: -600, to: 0 },
            opacity: { from: 0.2, to: 1 },
          },
        },
        (s) => {
          lastCam = s.values.cameraZ ?? 0;
          lastZ = s.values.z ?? 0;
        },
      );

      window.scrollTo(0, 0);
      const at0 = handle.update();
      window.scrollTo(0, 500);
      // rAF-coalesced; force one sample for the test.
      const atMid = handle.update();
      window.scrollTo(0, 1000);
      const atEnd = handle.update();

      handle.dispose();
      spacer.remove();
      window.scrollTo(0, 0);

      return {
        p0: at0.progress,
        pMid: atMid.progress,
        pEnd: atEnd.progress,
        camMid: atMid.values.cameraZ,
        zMid: atMid.values.z,
        opacityEnd: atEnd.values.opacity,
        lastCam,
        lastZ,
      };
    });

    expect(result.p0).toBeCloseTo(0, 3);
    expect(result.pMid).toBeCloseTo(0.5, 3);
    expect(result.pEnd).toBeCloseTo(1, 3);
    // Mid scrub: camera flying into the scene (negative), panel approaching (z↑).
    expect(result.camMid).toBeCloseTo(-200, 1);
    expect(result.zMid).toBeCloseTo(-300, 1);
    expect(result.opacityEnd).toBeCloseTo(1, 3);
  });

  test("scrollTrack + applyScrollSample are exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return {
        hasTrack: typeof gpu.scrollTrack === "function",
        hasApply: typeof gpu.applyScrollSample === "function",
        reduced: typeof gpu.prefersReducedMotion === "function",
      };
    });
    expect(ok.hasTrack).toBe(true);
    expect(ok.hasApply).toBe(true);
    expect(ok.reduced).toBe(true);
  });
});
