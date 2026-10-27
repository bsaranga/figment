import { expect, test } from "@playwright/test";

/**
 * M4h2 acceptance: z-scroll-story — panels approach camera on scroll
 * and stay clickable / AT-reachable.
 */

test.describe("M4h2 z-scroll story demo", () => {
  test("scroll flies camera Z and panels stay interactive", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5176/");
    await expect(page.locator(".intro h1")).toContainText("Scroll is a camera");
    await page.waitForFunction(() => !!window.__zStory);

    const panels = page.locator("figment-spatial-panel");
    await expect(panels).toHaveCount(3);

    // At top: progress ~0, camera at start.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(50);
    const at0 = await page.evaluate(() => ({
      p: window.__zStory.progress(),
      z: window.__zStory.cameraZ(),
    }));

    // Mid scroll: progress and camera Z move into the scene.
    await page.evaluate(() => {
      const story = document.getElementById("story")!;
      window.scrollTo(0, story.offsetTop + story.offsetHeight * 0.45);
    });
    await page.waitForTimeout(50);
    const atMid = await page.evaluate(() => ({
      p: window.__zStory.progress(),
      z: window.__zStory.cameraZ(),
    }));

    // Input in chapter 2 is still focusable (AT / interop contract).
    const input = page.locator('input[type="text"]');
    await input.focus();
    await input.fill("typed in Z-space");
    await expect(input).toHaveValue("typed in Z-space");

    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("type") === "text",
    );

    expect(at0.p).toBeCloseTo(0, 1);
    expect(atMid.p).toBeGreaterThan(0.3);
    expect(atMid.z).toBeLessThan(at0.z);
    expect(focused).toBe(true);
  });

  test("demo exposes __zStory", async ({ page }) => {
    await page.goto("http://127.0.0.1:5176/");
    await page.waitForFunction(() => !!window.__zStory);
    const ok = await page.evaluate(() => ({
      hasStory: !!window.__zStory.story,
      canRead: typeof window.__zStory.progress() === "number",
    }));
    expect(ok.hasStory).toBe(true);
    expect(ok.canRead).toBe(true);
  });
});
