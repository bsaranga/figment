import { expect, test } from "@playwright/test";

/**
 * M2j acceptance: scene camera + transform.z.
 * Panels at different z project differently; camera.z moves the fly-through.
 */

test.describe("M2j camera + transform.z", () => {
  test("depth scale and camera.z change projection and hits", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 400;
      stage.height = 280;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:400px;height:280px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
      document.body.append(stage);

      const mk = (id: string, z: number) => {
        const el = document.createElement("button");
        el.id = id;
        el.textContent = id;
        el.style.cssText =
          "position:absolute;left:140px;top:100px;width:120px;height:80px;background:#c23f53;border:0;";
        stage.append(el);
        return { el, z };
      };

      const near = mk("near-panel", 120);
      const far = mk("far-panel", -240);

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      host.setCamera({
        z: 0,
        perspective: 800,
        origin: { x: 200, y: 140 },
      });

      const nearLayer = host.layer(near.el, {
        id: "near-panel",
        transform: { x: 140, y: 100, z: near.z },
        drawAt: { x: 140, y: 100 },
        preserveHitTestOrder: true,
      });
      const farLayer = host.layer(far.el, {
        id: "far-panel",
        transform: { x: 140, y: 100, z: far.z },
        drawAt: { x: 140, y: 100 },
        preserveHitTestOrder: true,
      });
      await host.paintOnce();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await host.paintOnce();

      const sample = (x: number, y: number) => {
        const ctx = stage.getContext("2d")!;
        const { data } = ctx.getImageData(x, y, 1, 1);
        return (data[3] ?? 0) > 0;
      };

      // Near panel (z=+120, scale 800/680≈1.18) vs far (z=-240, scale 800/1040≈0.77)
      const nearW = near.el.getBoundingClientRect().width;
      const farW = far.el.getBoundingClientRect().width;

      // CSS transform includes translate3d Z
      const nearCss = near.el.style.transform;
      const farCss = far.el.style.transform;

      const drewAny = host.state().metrics.layersDrawn > 0;

      // Fly into the scene (camera z decreases toward far content at z=-240).
      host.setCamera({
        z: -200,
        perspective: 800,
        origin: { x: 200, y: 140 },
      });
      await host.paintOnce();
      const farWAfter = far.el.getBoundingClientRect().width;
      const nearWAfter = near.el.getBoundingClientRect().width;

      // Hits: topmost is near-panel at overlapping center after draw order.
      // far is enrolled second so it wins hit stack without preserve... both preserve order.
      // Enrollment order = bottom→top; near enrolled first is under far.
      // Local-space hit (accounts for depth scale CSS).
      const marker = document.createElement("i");
      marker.style.cssText = "position:absolute;left:50%;top:50%;width:0;height:0;";
      far.el.append(marker);
      const mr = marker.getBoundingClientRect();
      marker.remove();
      const hit = document.elementFromPoint(mr.left, mr.top);
      const hitId = hit?.id || null;

      // Fly camera toward the far panel (camera z decreases into the scene).
      host.setCamera({
        z: -1000,
        perspective: 800,
        origin: { x: 200, y: 140 },
      });
      await host.paintOnce();
      const farWFly = far.el.getBoundingClientRect().width;

      nearLayer.dispose();
      farLayer.dispose();
      await host.destroy();
      stage.remove();

      return {
        nearCss,
        farCss,
        nearW,
        farW,
        farWAfter,
        nearWAfter,
        hitId,
        farWFly,
        drewAny,
      };
    });

    // Depth is applied as explicit scale (matches GPU draw projection).
    expect(result.nearCss).toContain("scale(");
    expect(result.nearCss).toContain("translate(140px, 100px)");
    expect(result.farCss).toContain("scale(");

    // Positive z projects larger than negative z at camera z=0.
    expect(result.nearW).toBeGreaterThan(result.farW);

    // Camera moving into the scene enlarges the far panel relatively.
    expect(result.farWAfter).toBeGreaterThan(result.farW);
    expect(result.nearWAfter).toBeGreaterThan(result.nearW);

    // Hits resolve to a panel (topmost enrolled).
    expect(["near-panel", "far-panel"]).toContain(result.hitId);

    // Camera far back: far panel remains projected (scale < 1 still visible width > 0).
    expect(result.farWFly).toBeGreaterThan(0);
    expect(result.drewAny).toBe(true);
  });

  test("near-plane clip drops the layer from the frame", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;
      const stage = document.createElement("canvas");
      stage.width = 200;
      stage.height = 160;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:200px;height:160px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
      document.body.append(stage);

      const el = document.createElement("div");
      el.id = "clip-me";
      el.style.cssText =
        "position:absolute;left:20px;top:20px;width:80px;height:60px;background:#c23f53;";
      stage.append(el);

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      host.setCamera({ z: 0, perspective: 800, near: 0, origin: { x: 100, y: 80 } });

      const layer = host.layer(el, {
        id: "clip-me",
        transform: { x: 20, y: 20, z: 0 },
        drawAt: { x: 20, y: 20 },
      });
      await host.paintOnce();

      const ctx = stage.getContext("2d")!;
      const hasPixel = () => {
        const { data } = ctx.getImageData(40, 40, 1, 1);
        return (data[3] ?? 0) > 0;
      };

      const before = hasPixel();

      // Layer z=750, camera z=0, P=800 → distance=50. near=150 ⇒ near-clipped.
      layer.setTransform({ z: 750 });
      host.setCamera({
        z: 0,
        perspective: 800,
        near: 150,
        far: 2000,
        origin: { x: 100, y: 80 },
      });
      await host.paintOnce();
      const afterNearClip = hasPixel();

      layer.dispose();
      await host.destroy();
      stage.remove();
      return { before, afterNearClip };
    });

    expect(result.before).toBe(true);
    expect(result.afterNearClip).toBe(false);
  });

  test("host.getCamera / setCamera round-trip", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const cam = await page.evaluate(() => {
      const host = window.__figment.host;
      host.setCamera({
        z: 150,
        perspective: 900,
        near: 20,
        far: 2000,
        origin: { x: 10, y: 20 },
      });
      return host.getCamera();
    });

    expect(cam.z).toBe(150);
    expect(cam.perspective).toBe(900);
    expect(cam.near).toBe(20);
    expect(cam.far).toBe(2000);
    expect(cam.origin).toEqual({ x: 10, y: 20 });
  });
});
