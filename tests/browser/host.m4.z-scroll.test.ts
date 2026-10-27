import { expect, test } from "@playwright/test";

/**
 * M4b2 acceptance: figment-z-scroll pins a stage and flies camera Z
 * with scroll (Awwwards-style Z fly-through of real HTML).
 */

test.describe("M4b2 z-scroll story stage", () => {
  test("scroll drives camera Z through the pinned stage", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerZScroll();
      ui.registerSpatialPanel();

      // Page needs scroll height for the track.
      const host = document.createElement("figment-z-scroll") as HTMLElement & {
        update: () => { progress: number; cameraZ: number };
        state: { progress: number; cameraZ: number };
      };
      host.setAttribute("track-height", "2000px");
      host.setAttribute("camera-from", "0");
      host.setAttribute("camera-to", "-600");
      host.setAttribute("perspective", "1000");

      // Real HTML panel inside the story stage.
      const panel = document.createElement("figment-spatial-panel") as HTMLElement;
      panel.setAttribute("z", "-200");
      panel.innerHTML = `<span slot="title">Chapter</span><p>Fly through me</p>`;
      host.append(panel);

      document.body.append(host);

      const stage = host.shadowRoot!.querySelector(".stage") as HTMLElement;
      const camera = host.shadowRoot!.querySelector(".camera") as HTMLElement;

      const top = host.offsetTop;
      // Progress 0 at track start.
      window.scrollTo(0, top);
      const at0 = host.update();
      const t0 = camera.style.transform;

      // Mid track: camera Z halfway.
      window.scrollTo(0, top + 700);
      const atMid = host.update();
      const tMid = camera.style.transform;

      // Near end: camera deeper.
      window.scrollTo(0, top + 1400);
      const atEnd = host.update();
      const tEnd = camera.style.transform;

      const pinned = getComputedStyle(stage).position;
      const perspective = getComputedStyle(stage).perspective;

      host.remove();
      window.scrollTo(0, 0);

      return {
        p0: at0.progress,
        pMid: atMid.progress,
        cam0: at0.cameraZ,
        camMid: atMid.cameraZ,
        camEnd: atEnd.cameraZ,
        t0,
        tMid,
        tEnd,
        pinned,
        perspective,
        panelTag: panel.tagName.toLowerCase(),
      };
    });

    expect(result.panelTag).toBe("figment-spatial-panel");
    expect(result.pinned).toBe("sticky");
    expect(result.p0).toBeCloseTo(0, 2);
    expect(result.pMid).toBeGreaterThan(0.2);
    expect(result.cam0).toBeCloseTo(0, 1);
    // Camera flies into the scene (more negative).
    expect(result.camMid).toBeLessThan(result.cam0);
    expect(result.camEnd).toBeLessThan(result.camMid);
    expect(result.t0).toContain("translateZ(");
    expect(result.tEnd).toContain("-6");
  });

  test("registerZScroll is exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      return typeof ui.registerZScroll === "function";
    });
    expect(ok).toBe(true);
  });
});
