import { expect, test } from "@playwright/test";

/**
 * M3j acceptance: presence enter/exit (toast dissolve path).
 */

test.describe("M3j presence", () => {
  test("toast-style enter then dissolve exit", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );

      // Pretend toast node (presence drives motion; host draws it).
      const toast = document.createElement("div");
      toast.style.cssText = "width:200px;height:48px;background:#222;color:#fff;";
      toast.textContent = "Saved";
      document.body.append(toast);

      const p = gpu.presence(toast, {
        present: true,
        enter: { duration: 50, easing: "linear", to: { opacity: 1, y: 0 } },
        exit: gpu.DISSOLVE_EXIT,
      });
      await p.done;
      const afterEnter = {
        phase: p.phase,
        opacity: p.value().opacity,
      };

      p.setPresent(false);
      await p.done;
      const afterExit = {
        phase: p.phase,
        opacity: p.value().opacity,
      };

      toast.remove();
      return { afterEnter, afterExit };
    });

    expect(result.afterEnter.phase).toBe("visible");
    expect(result.afterEnter.opacity).toBeCloseTo(1, 2);
    expect(result.afterExit.phase).toBe("hidden");
    expect(result.afterExit.opacity).toBeCloseTo(0, 2);
  });

  test("presence + DISSOLVE_EXIT are exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const gpu = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/gpu/src/index.ts"
      );
      return {
        hasPresence: typeof gpu.presence === "function",
        dissolve: gpu.DISSOLVE_EXIT.to,
      };
    });
    expect(ok.hasPresence).toBe(true);
    expect(ok.dissolve.opacity).toBe(0);
  });
});
