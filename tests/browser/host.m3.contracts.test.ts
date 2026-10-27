import { expect, test } from "@playwright/test";

/**
 * M3k acceptance: interaction contracts throw on violations;
 * live controls only relit (no pixel-moving effects in material mode).
 */

test.describe("M3k interaction contracts", () => {
  test("material + live controls: light ok, pixel-effect throws", async ({
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

      let lightErr: string | null = null;
      try {
        gpu.assertContract({
          mode: "material",
          content: { hasLiveControls: true },
          operation: "light",
        });
      } catch (e) {
        lightErr = (e as Error).message;
      }

      let effectErr: string | null = null;
      try {
        gpu.assertContract({
          mode: "material",
          content: { hasLiveControls: true },
          operation: "effect",
        });
      } catch (e) {
        effectErr = (e as Error).message;
      }

      let reliefErr: string | null = null;
      try {
        gpu.assertContract({
          mode: "material",
          content: { hasLiveControls: true },
          operation: "material",
          kind: "relief",
        });
      } catch (e) {
        reliefErr = (e as Error).message;
      }

      return { lightErr, effectErr, reliefErr };
    });

    expect(result.lightErr).toBeNull();
    expect(result.effectErr).toMatch(/forbids pixel-moving/);
    expect(result.reliefErr).toBeNull();
  });

  test("decorative rejects live controls and requires inert", async ({
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
      let noInert: string | null = null;
      try {
        gpu.assertContract({
          mode: "decorative",
          content: {},
          operation: "effect",
        });
      } catch (e) {
        noInert = (e as Error).message;
      }
      let live: string | null = null;
      try {
        gpu.assertContract({
          mode: "decorative",
          content: { inertOrAriaHidden: true, hasLiveControls: true },
          operation: "effect",
        });
      } catch (e) {
        live = (e as Error).message;
      }
      return { noInert, live };
    });

    expect(result.noInert).toMatch(/requires inert/);
    expect(result.live).toMatch(/live controls/);
  });

  test("withInert + mode registry exposed", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      const el = document.createElement("button");
      document.body.append(el);
      const ran = gpu.withInert(el, () => el.hasAttribute("inert"));
      el.remove();
      gpu.setInteractionMode("chip", "inert");
      return {
        ran,
        mode: gpu.getInteractionMode("chip"),
        table: gpu.CONTRACTS.material.mayMovePixels,
      };
    });
    expect(ok.ran).toBe(true);
    expect(ok.mode).toBe("inert");
    expect(ok.table).toBe(false);
  });
});
