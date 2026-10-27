import { expect, test } from "@playwright/test";

/**
 * M2e acceptance: transform origin / pivot.
 * Rotate about `center` keeps the center fixed; `top-left` does not.
 */

test.describe("M2e transform origin", () => {
  test("draw + hit honor layer.origin (center vs top-left)", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 320;
      stage.height = 200;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:320px;height:200px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
      document.body.append(stage);

      const mkCard = (id: string) => {
        const el = document.createElement("button");
        el.id = id;
        el.textContent = id;
        el.style.cssText =
          "position:absolute;left:40px;top:40px;width:120px;height:80px;background:#c23f53;border:0;margin:0;";
        stage.append(el);
        return el;
      };

      const card = mkCard("pivot-card");
      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);

      const layer = host.layer(card, {
        id: "pivot-card",
        drawAt: { x: 40, y: 40 },
        origin: "center",
        preserveHitTestOrder: true,
      });
      await host.paintOnce();

      const sample = (x: number, y: number) => {
        const ctx = stage.getContext("2d")!;
        const { data } = ctx.getImageData(x, y, 1, 1);
        return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0, a: data[3] ?? 0 };
      };

      const isCard = (c: { r: number; g: number; b: number; a: number }) =>
        c.a > 200 && c.r > 150 && c.g < 120;

      // Center of the 120×80 card at draw (40,40) → (100, 80).
      const beforeCenter = sample(100, 80);

      // Rotate 180° about center — center pixel must stay card-colored.
      layer.setTransform({ rotation: 180 });
      await host.paintOnce();
      const afterCenter180 = sample(100, 80);

      // Corners should move under 180° (card still covers the same AABB).
      const cornerStill = sample(45, 45);

      // Switch pivot to top-left and rotate 90° — center should move off.
      layer.setOrigin("top-left");
      layer.setTransform({ rotation: 90 });
      await host.paintOnce();
      const centerAfterTopLeft = sample(100, 80);

      // Back to center — CSS transform-origin and hits must follow.
      layer.setOrigin("center");
      layer.setTransform({ rotation: 180 });
      await host.paintOnce();
      const cssOrigin = card.style.transformOrigin;

      // Hit at the card's visual center after 180°/center is still the card.
      const r = card.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      const hitId = hit?.id || null;

      layer.dispose();
      await host.destroy();
      stage.remove();

      return {
        beforeCenter: isCard(beforeCenter),
        afterCenter180: isCard(afterCenter180),
        cornerStill: isCard(cornerStill),
        centerAfterTopLeft: isCard(centerAfterTopLeft),
        cssOrigin,
        hitId,
      };
    });

    // Rotation about center keeps the center pixel on the card.
    expect(result.beforeCenter).toBe(true);
    expect(result.afterCenter180).toBe(true);

    // About top-left, 90° should move the body away from the old center.
    expect(result.centerAfterTopLeft).toBe(false);

    // DOM hit-testing uses the same pivot keyword.
    expect(result.cssOrigin).toMatch(/center/i);
    expect(result.hitId).toBe("pivot-card");
  });

  test("layer.setOrigin updates CSS transform-origin", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const origin = await page.evaluate(async () => {
      const host = window.__figment.host;
      // profile layer exists; flip origin via a throwaway layer
      const el = document.createElement("div");
      el.style.cssText = "width:10px;height:10px;background:red;";
      document.body.append(el);
      const handle = host.layer(el, { id: "origin-probe", origin: "center" });
      const before = (el as HTMLElement).style.transformOrigin;
      handle.setOrigin({ x: 0.25, y: 0.75 });
      const after = (el as HTMLElement).style.transformOrigin;
      handle.dispose();
      el.remove();
      return { before, after };
    });

    expect(origin.before).toMatch(/center/i);
    expect(origin.after).toMatch(/25%/);
    expect(origin.after).toMatch(/75%/);
  });
});
