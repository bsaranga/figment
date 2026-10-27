import { expect, test } from "@playwright/test";

/**
 * M2f acceptance: tilt projective matrix — a tilted panel draws + hits.
 */

test.describe("M2f projective tilt", () => {
  test("tilted layer applies CSS perspective and keeps local hits", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 360;
      stage.height = 240;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:360px;height:240px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
      document.body.append(stage);

      const card = document.createElement("button");
      card.id = "tilt-card";
      card.textContent = "tilt";
      card.style.cssText =
        "position:absolute;left:80px;top:50px;width:160px;height:100px;background:#c23f53;border:0;";
      stage.append(card);

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);

      const layer = host.layer(card, {
        id: "tilt-card",
        drawAt: { x: 80, y: 50 },
        origin: "center",
        tilt: { x: 18, y: -24, perspective: 900 },
        preserveHitTestOrder: true,
      });
      await host.paintOnce();

      const cssTransform = card.style.transform;
      const cssOrigin = card.style.transformOrigin;

      // Local-space hit samples under the tilt (M2b marker technique).
      const hitLocal = (lx: number, ly: number) => {
        const marker = document.createElement("i");
        marker.style.cssText = `position:absolute;left:${lx}px;top:${ly}px;width:0;height:0;`;
        card.append(marker);
        const r = marker.getBoundingClientRect();
        marker.remove();
        const hit = document.elementFromPoint(r.left, r.top);
        return hit === card || card.contains(hit);
      };

      const centerHit = hitLocal(80, 50);
      const tlHit = hitLocal(12, 10);
      const brHit = hitLocal(148, 90);

      // Pixels still land (draw path active).
      const ctx = stage.getContext("2d")!;
      const { data } = ctx.getImageData(120, 80, 1, 1);
      const drew = (data[3] ?? 0) > 0;

      // Clear tilt — transform is reset.
      layer.setTransform({}); // no-op
      layer.dispose();
      await host.destroy();
      stage.remove();

      return {
        cssTransform,
        cssOrigin,
        centerHit,
        tlHit,
        brHit,
        drew,
      };
    });

    expect(result.cssTransform).toMatch(/perspective\(900px\)/);
    expect(result.cssTransform).toMatch(/rotateX\(18deg\)/);
    expect(result.cssTransform).toMatch(/rotateY\(-24deg\)/);
    expect(result.cssOrigin).toMatch(/center/i);
    expect(result.centerHit).toBe(true);
    expect(result.tlHit).toBe(true);
    expect(result.brHit).toBe(true);
    expect(result.drew).toBe(true);
  });

  test("zero tilt does not leave a transform", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const transform = await page.evaluate(async () => {
      const { createHost } = window.__admission;
      const stage = document.createElement("canvas");
      stage.width = 100;
      stage.height = 100;
      stage.setAttribute("content", "drawable");
      stage.style.cssText = "width:100px;height:100px;position:fixed;left:0;top:0;";
      document.body.append(stage);
      const el = document.createElement("div");
      el.style.cssText = "width:40px;height:20px;background:red;";
      stage.append(el);
      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      const layer = host.layer(el, { id: "flat", tilt: { x: 0, y: 0 } });
      await host.paintOnce();
      const t = (el as HTMLElement).style.transform;
      layer.dispose();
      await host.destroy();
      stage.remove();
      return t;
    });

    expect(transform).toBe("");
  });
});
