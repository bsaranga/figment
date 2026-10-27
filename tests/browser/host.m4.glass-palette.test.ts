import { expect, test } from "@playwright/test";

/**
 * M4i acceptance: glass-palette showcase — ⌘K glass palette + materials.
 */

test.describe("M4i glass palette demo", () => {
  test("palette opens, glass toggles, toast shows", async ({ page }) => {
    await page.goto("http://127.0.0.1:5177/");
    await expect(page.locator("h1")).toContainText("Glass palette");
    await page.waitForFunction(() => !!window.__glassPalette);

    // Glass panel starts glass.
    const start = await page.evaluate(() => {
      const p = document.getElementById("glass-panel")!;
      return p.getAttribute("material");
    });
    expect(start).toBe("glass");

    // Toggle button flips material.
    await page.click("#flip-glass");
    const flipped = await page.evaluate(
      () => document.getElementById("glass-panel")!.getAttribute("material"),
    );
    expect(flipped).toBe("relief");

    // ⌘K opens palette.
    await page.keyboard.press("Meta+k");
    const open = await page.evaluate(
      () => document.getElementById("palette")!.hasAttribute("open"),
    );
    expect(open).toBe(true);

    // Focus project via command (AT path).
    await page.evaluate(() => {
      const pal = document.getElementById("palette") as HTMLElement & {
        setCommands: (c: unknown[]) => void;
        open: () => void;
        confirm: () => unknown;
      };
      pal.setCommands([{ id: "focus-name", label: "Focus project name" }]);
      pal.open();
      pal.confirm();
    });
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("project");

    // Toast shows and hides.
    await page.click("#show-toast");
    await expect(page.locator("#toast")).toHaveAttribute("open", "");
    await page.evaluate(() => {
      (document.getElementById("toast") as unknown as { hide: () => Promise<void> }).hide();
    });
  });

  test("demo exposes __glassPalette", async ({ page }) => {
    await page.goto("http://127.0.0.1:5177/");
    await page.waitForFunction(() => !!window.__glassPalette);
    const ok = await page.evaluate(() => ({
      hasPalette: !!window.__glassPalette.palette,
      hasToast: !!window.__glassPalette.toast,
    }));
    expect(ok.hasPalette).toBe(true);
    expect(ok.hasToast).toBe(true);
  });
});
