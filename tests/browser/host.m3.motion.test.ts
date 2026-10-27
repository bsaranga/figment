import { expect, test } from "@playwright/test";

/**
 * M3i acceptance: keyed layer motion — transition + staggered group.
 */

test.describe("M3i motion", () => {
  test("transition animates a layer channel over time", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );

      const h = gpu.transition("panel", {
        duration: 80,
        easing: "linear",
        to: { x: 100, opacity: 0.5 },
        from: { x: 0, opacity: 1 },
      });

      const samples: number[] = [];
      await new Promise<void>((resolve) => {
        const off = gpu.startMotionLoop([h], (handle) => {
          samples.push(handle.value().x);
          if (!handle.running) {
            off();
            resolve();
          }
        });
      });
      await h.done;

      return {
        first: samples[0] ?? 0,
        last: samples[samples.length - 1] ?? -1,
        mid: samples[Math.floor(samples.length / 2)] ?? -1,
        opacity: h.value().opacity,
      };
    });

    expect(result.last).toBeCloseTo(100, 3);
    expect(result.opacity).toBeCloseTo(0.5, 3);
    // Progresses from near 0 toward 100.
    expect(result.last).toBeGreaterThan(result.first);
    expect(result.mid).toBeGreaterThan(result.first);
    expect(result.mid).toBeLessThan(result.last);
  });

  test("transitionGroup staggers starts", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      const group = gpu.transitionGroup(
        [
          { layerId: "a", desc: { duration: 40, easing: "linear", to: { y: 50 } } },
          { layerId: "b", desc: { duration: 40, easing: "linear", to: { y: 50 } } },
        ],
        60,
      );

      const off = gpu.startMotionLoop(group, () => {});
      // After ~25ms, first has moved; second should still be near 0 (stagger 60).
      await new Promise((r) => setTimeout(r, 25));
      const a = group[0]!.value().y;
      const b = group[1]!.value().y;

      await new Promise<void>((resolve) => {
        const poll = () => {
          if (group.every((h) => !h.running)) {
            off();
            resolve();
          } else {
            setTimeout(poll, 10);
          }
        };
        poll();
      });

      return {
        earlyA: a,
        earlyB: b,
        endA: group[0]!.value().y,
        endB: group[1]!.value().y,
      };
    });

    expect(result.earlyA).toBeGreaterThan(result.earlyB);
    expect(result.endA).toBeCloseTo(50, 3);
    expect(result.endB).toBeCloseTo(50, 3);
  });
});
