import { expect, test } from "@playwright/test";

/**
 * M4a acceptance: tokens themable in DOM mode and canvas mode.
 */

test.describe("M4a design tokens", () => {
  test("installTokenStyles + applyTokens theme DOM and canvas host", async ({
    page,
  }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );

      ui.installTokenStyles(document, {
        "--figment-color-accent": "#ff66aa",
      });

      // DOM node
      const card = document.createElement("div");
      card.id = "themed-card";
      document.body.append(card);
      ui.applyTokens(card, {
        "--figment-color-surface": "#223344",
        "--figment-radius-lg": "30px",
      });

      // Canvas host (DOM mode companion surface)
      const stage = document.createElement("canvas");
      stage.id = "themed-stage";
      stage.setAttribute("content", "drawable");
      document.body.append(stage);
      ui.applyTokens(stage, {
        "--figment-glass-tint": "#aabbcc",
      });

      const cardSurface = ui.getToken(card, "--figment-color-surface");
      const cardRadius = ui.getToken(card, "--figment-radius-lg");
      const glass = ui.getToken(stage, "--figment-glass-tint");
      const rootAccent = ui.getToken(
        document.documentElement,
        "--figment-color-accent",
      );
      const styleTag = document.getElementById("figment-tokens")?.textContent ?? "";

      card.remove();
      stage.remove();

      return {
        cardSurface,
        cardRadius,
        glass,
        rootAccent,
        styleTagHasAccent: styleTag.includes("--figment-color-accent: #ff66aa"),
        defaultBg: ui.DEFAULT_TOKENS["--figment-color-bg"],
      };
    });

    expect(result.cardSurface).toBe("#223344");
    expect(result.cardRadius).toBe("30px");
    expect(result.glass).toBe("#aabbcc");
    expect(result.rootAccent).toBe("#ff66aa");
    expect(result.styleTagHasAccent).toBe(true);
    expect(result.defaultBg).toBeTruthy();
  });

  test("resolveTokens merges without clobbering defaults", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      const t = ui.resolveTokens({ "--figment-text-lg": "40px" });
      return {
        lg: t["--figment-text-lg"],
        bg: t["--figment-color-bg"],
        css: ui.tokensToCss().includes("--figment-font-sans"),
      };
    });
    expect(ok.lg).toBe("40px");
    expect(ok.bg).toBe("#0b0d12");
    expect(ok.css).toBe(true);
  });
});
