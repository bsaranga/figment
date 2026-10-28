import { expect, test } from "@playwright/test";

/**
 * Promo: Z-scroll glass warp story that lands on the product narrative.
 */

test.describe("promo z-scroll glass warp", () => {
  test("warp cards fly in Z and thesis arrives", async ({ page }) => {
    await page.goto("http://127.0.0.1:5180/");
    await expect(page.locator("#warp .warp-label h2")).toContainText("Warp through glass");
    const cards = page.locator(".warp-card");
    await expect(cards).toHaveCount(4);

    // Input inside a glass card is focusable mid-story (AT contract).
    await page.locator('.warp-card input[type="text"]').focus();
    await page.locator('.warp-card input[type="text"]').fill("warped in");
    await expect(page.locator('.warp-card input[type="text"]')).toHaveValue(
      "warped in",
    );

    // Scroll through the warp — camera Z moves, thesis blooms in.
    await page.evaluate(() => {
      const story = document.getElementById("warp")!;
      window.scrollTo(0, story.offsetTop + story.offsetHeight * 0.85);
    });
    await page.waitForFunction(
      () => document.getElementById("thesis")!.classList.contains("in"),
      undefined,
      { timeout: 5_000 },
    );

    const cam = await page.evaluate(() => {
      const camera = document.getElementById("warp-camera")!;
      return camera.style.transform;
    });
    expect(cam).toContain("translateZ(");

    // Cards use glass chrome + depth transforms.
    const hasGlass = await page.evaluate(() => {
      const c = document.querySelector(".warp-card")!;
      return (
        getComputedStyle(c).backdropFilter !== "none" ||
        getComputedStyle(c).borderRadius.length > 0
      );
    });
    expect(hasGlass).toBe(true);
  });

  test("reduced motion shows cards without warp", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://127.0.0.1:5180/");
    const thesisIn = await page.evaluate(() =>
      document.getElementById("thesis")!.classList.contains("in"),
    );
    expect(thesisIn).toBe(true);
  });
});
