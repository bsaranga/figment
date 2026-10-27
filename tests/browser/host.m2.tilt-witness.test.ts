import { expect, test } from "@playwright/test";

/**
 * M2g acceptance: tilt admission witness.
 * layer() with non-zero tilt runs a hit witness; failure throws tilt-unsupported.
 */

test.describe("M2g tilt admission witness", () => {
  test("witnessTilt passes on a tiltable panel and is recorded", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost, witnessTilt } = window.__admission;

      // Standalone witness on plain DOM (no drawable canvas).
      const domCard = document.createElement("button");
      domCard.id = "dom-witness";
      domCard.style.cssText =
        "position:fixed;left:0;top:0;width:160px;height:100px;background:#c23f53;border:0;z-index:2147483000;";
      document.body.append(domCard);
      const domWitness = witnessTilt({
        element: domCard,
        tilt: { x: 12, y: -18, perspective: 1000 },
      });
      domCard.remove();

      const stage = document.createElement("canvas");
      stage.width = 320;
      stage.height = 220;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:320px;height:220px;position:fixed;left:0;top:0;z-index:2147483000;";
      document.body.append(stage);

      const card = document.createElement("button");
      card.id = "witness-card";
      card.style.cssText =
        "position:absolute;left:40px;top:40px;width:160px;height:100px;background:#c23f53;border:0;";
      stage.append(card);

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      // layer() runs the M2g witness internally (after geometry + paint).
      const layer = host.layer(card, {
        id: "witness-card",
        drawAt: { x: 40, y: 40 },
        tilt: { x: 12, y: -18, perspective: 1000 },
        origin: "center",
      });
      await host.paintOnce();

      const metrics = host.state().metrics;
      layer.dispose();
      await host.destroy();
      stage.remove();

      return {
        domWitnessOk: domWitness.ok,
        domWitnessDetail: domWitness.detail,
        sampleCount: domWitness.samples.length,
        allMatched: domWitness.samples.every((s) => s.matched),
        tiltWitnesses: metrics.tiltWitnesses,
        tiltWitnessFailures: metrics.tiltWitnessFailures,
      };
    });

    expect(result.domWitnessOk).toBe(true);
    expect(result.domWitnessDetail).toMatch(/tilt witness ok/i);
    expect(result.sampleCount).toBeGreaterThanOrEqual(5);
    expect(result.allMatched).toBe(true);
    expect(result.tiltWitnesses).toBeGreaterThanOrEqual(1);
    expect(result.tiltWitnessFailures).toBe(0);
  });

  test("layer() throws tilt-unsupported when the witness fails", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const { createHost, witnessTilt } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 200;
      stage.height = 160;
      stage.setAttribute("content", "drawable");
      stage.style.cssText =
        "width:200px;height:160px;position:fixed;left:0;top:0;z-index:2147483000;";
      document.body.append(stage);

      // 1×1 element — witness must refuse (empty / unhit-able box).
      const stub = document.createElement("div");
      stub.style.cssText = "position:absolute;left:10px;top:10px;width:1px;height:1px;";
      stage.append(stub);

      const direct = witnessTilt({
        element: stub,
        tilt: { x: 20, y: 20 },
      });

      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);

      let threw: { name: string; reason?: string; message: string } | null = null;
      try {
        host.layer(stub, {
          id: "bad-tilt",
          tilt: { x: 25, y: 25, perspective: 800 },
        });
      } catch (e) {
        const err = e as Error & { reason?: string };
        threw = {
          name: err.name,
          reason: err.reason,
          message: err.message,
        };
      }

      const metrics = host.state().metrics;
      await host.destroy();
      stage.remove();

      return { directOk: direct.ok, directDetail: direct.detail, threw, metrics };
    });

    expect(result.directOk).toBe(false);
    expect(result.threw).not.toBeNull();
    expect(result.threw!.name).toBe("FigmentUnsupportedError");
    expect(result.threw!.reason).toBe("tilt-unsupported");
    expect(result.metrics.tiltWitnessFailures).toBeGreaterThanOrEqual(1);
  });

  test("zero tilt skips the witness", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const metrics = await page.evaluate(async () => {
      const { createHost } = window.__admission;
      const stage = document.createElement("canvas");
      stage.width = 80;
      stage.height = 60;
      stage.setAttribute("content", "drawable");
      stage.style.cssText = "width:80px;height:60px;position:fixed;left:0;top:0;";
      document.body.append(stage);
      const el = document.createElement("div");
      el.style.cssText = "width:30px;height:20px;background:red;";
      stage.append(el);
      const host = createHost(stage, { backend: "2d" });
      await host.admit();
      host.mount(stage);
      const layer = host.layer(el, { id: "flat", tilt: { x: 0, y: 0 } });
      const m = host.state().metrics;
      layer.dispose();
      await host.destroy();
      stage.remove();
      return m;
    });

    expect(metrics.tiltWitnesses).toBe(0);
    expect(metrics.tiltWitnessFailures).toBe(0);
  });
});
