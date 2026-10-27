import { expect, test } from "@playwright/test";

/**
 * M2c acceptance: seamless first enable.
 * Canvas stays hidden (opacity 0 / pointer-events none) until the first
 * complete frame draws ≥1 layer — then swap. No blank flash.
 */

test.describe("M2c seamless first enable", () => {
  test("host canvas stays pending until the first complete layer frame", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const timeline = await page.evaluate(async () => {
      const { createHost } = window.__admission;

      const stage = document.createElement("canvas");
      stage.width = 320;
      stage.height = 200;
      stage.id = "seamless-stage";
      stage.setAttribute("content", "drawable");
      stage.style.cssText = "width:320px;height:200px;background:#12161f;";
      document.body.append(stage);

      const host = createHost(stage, { backend: "2d" });

      const snap = (label: string) => ({
        label,
        pending: host.state().pendingEnable,
        marker: stage.getAttribute("data-figment-pending"),
        cover: !!document.querySelector("[data-figment-pending-cover]"),
        seamlessSwaps: host.state().metrics.seamlessSwaps,
      });

      const steps = [snap("after-createHost")];

      await host.admit();
      steps.push(snap("after-admit"));

      // No layers yet — must still be pending even if paint runs.
      host.requestPaint();
      await host.paintOnce();
      steps.push(snap("after-paint-empty"));

      const form = document.createElement("div");
      form.id = "seamless-card";
      form.style.cssText =
        "width:120px;height:40px;background:#c23f53;color:#fff;font:14px system-ui;";
      form.textContent = "card";
      stage.append(form);
      host.mount(stage);
      host.layer(form, { id: "card", drawAt: { x: 20, y: 20 } });
      await host.paintOnce();
      steps.push(snap("after-first-layer"));

      // Complete-frame proof: sample must be the card color, not empty.
      const ctx = stage.getContext("2d")!;
      const { data } = ctx.getImageData(40, 30, 1, 1);
      steps.push({
        label: "pixel",
        pending: host.state().pendingEnable,
        marker: stage.getAttribute("data-figment-pending"),
        cover: !!document.querySelector("[data-figment-pending-cover]"),
        seamlessSwaps: host.state().metrics.seamlessSwaps,
        r: data[0] ?? -1,
        g: data[1] ?? -1,
        b: data[2] ?? -1,
        a: data[3] ?? -1,
      } as never);

      await host.destroy();
      stage.remove();
      return steps;
    });

    const byLabel = Object.fromEntries(
      timeline.map((s) => [s.label, s as Record<string, unknown>]),
    );

    for (const label of [
      "after-createHost",
      "after-admit",
      "after-paint-empty",
    ]) {
      const s = byLabel[label];
      expect(s.pending, label).toBe(true);
      expect(s.marker, label).toBe("1");
      expect(s.cover, label).toBe(true);
      expect(s.seamlessSwaps, label).toBe(0);
    }

    const done = byLabel["after-first-layer"];
    expect(done.pending).toBe(false);
    expect(done.marker).toBeNull();
    expect(done.cover).toBe(false);
    expect(done.seamlessSwaps).toBe(1);

    const pixel = byLabel["pixel"];
    // Card #c23f53 at (40,30) — complete frame, not a blank clear.
    expect(pixel.r as number).toBeGreaterThan(150);
    expect(pixel.g as number).toBeLessThan(120);
  });

  test("demo is already swapped when status is ok (no blank in the golden path)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const state = await page.evaluate(() => {
      const stage = document.getElementById("stage") as HTMLCanvasElement;
      return {
        pending: window.__figment.host.state().pendingEnable,
        seamlessSwaps: window.__figment.host.state().metrics.seamlessSwaps,
        marker: stage.getAttribute("data-figment-pending"),
        cover: !!document.querySelector("[data-figment-pending-cover]"),
        layersDrawn: window.__figment.host.state().metrics.layersDrawn,
      };
    });

    expect(state.pending).toBe(false);
    expect(state.seamlessSwaps).toBeGreaterThanOrEqual(1);
    expect(state.marker).toBeNull();
    expect(state.cover).toBe(false);
    expect(state.layersDrawn).toBeGreaterThan(0);
  });

  test("react demo swaps only after a complete frame", async ({ page }) => {
    await page.goto("http://127.0.0.1:5174/");
    await expect(page.locator("#status")).toHaveClass(/ok/);

    const state = await page.evaluate(() => {
      const stage = document.getElementById("stage") as HTMLCanvasElement;
      return {
        pending: window.__figment.host.state().pendingEnable,
        seamlessSwaps: window.__figment.host.state().metrics.seamlessSwaps,
        marker: stage.getAttribute("data-figment-pending"),
      };
    });
    expect(state.pending).toBe(false);
    expect(state.seamlessSwaps).toBeGreaterThanOrEqual(1);
    expect(state.marker).toBeNull();
  });
});
