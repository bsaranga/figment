import { expect, test, type Page } from "@playwright/test";

/**
 * M1l done-when: pixel + hit parity between vanilla-mount (5173) and
 * react-mount (5174). Same shared form fixture, same layer opts.
 */

const VANILLA = "http://127.0.0.1:5173/";
const REACT = "http://127.0.0.1:5174/";

async function boot(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("#status")).toHaveClass(/ok/);
  await page.waitForFunction(
    () => window.__figment.host.state().metrics.paints > 0,
  );
  await page.evaluate(() => window.__figment.host.paintOnce());
}

/** Sample canvas RGB at CSS-relative points inside the stage. */
async function sampleCanvas(page: Page, points: { x: number; y: number }[]) {
  return page.evaluate((pts) => {
    const c = document.getElementById("stage") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    return pts.map((p) => {
      const { data } = ctx.getImageData(p.x, p.y, 1, 1);
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });
  }, points);
}

function colorClose(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  slack = 8,
) {
  return (
    Math.abs(a.r - b.r) <= slack &&
    Math.abs(a.g - b.g) <= slack &&
    Math.abs(a.b - b.b) <= slack
  );
}

test.describe("vanilla ↔ react parity", () => {
  test("pixel samples match on the drawn profile layer", async ({ browser }) => {
    const vanillaPage = await browser.newPage();
    const reactPage = await browser.newPage();
    try {
      await boot(vanillaPage, VANILLA);
      await boot(reactPage, REACT);

      // Layer is drawn at (24,24) with 280px-wide form card (bg #1b2230).
      // Sample: card chrome, input area, and outside-card stage bg.
      const points = [
        { x: 40, y: 40 }, // card padding / near title
        { x: 160, y: 120 }, // mid form
        { x: 700, y: 300 }, // stage background
      ];

      const a = await sampleCanvas(vanillaPage, points);
      const b = await sampleCanvas(reactPage, points);

      for (let i = 0; i < points.length; i++) {
        expect(
          colorClose(a[i], b[i]),
          `pixel ${JSON.stringify(points[i])} vanilla=${JSON.stringify(a[i])} react=${JSON.stringify(b[i])}`,
        ).toBe(true);
      }

      // Card body must actually be the form background (not empty stage).
      expect(a[0].r).toBeGreaterThan(15);
      expect(a[0].r).toBeLessThan(50);
    } finally {
      await vanillaPage.close();
      await reactPage.close();
    }
  });

  test("hit-testing: same click + type + submit flow on both", async ({
    browser,
  }) => {
    const vanillaPage = await browser.newPage();
    const reactPage = await browser.newPage();
    try {
      await boot(vanillaPage, VANILLA);
      await boot(reactPage, REACT);

      for (const page of [vanillaPage, reactPage]) {
        const name = page.locator('[data-testid="name"]');
        await name.click();
        await name.fill("Ada Lovelace");
        await page.locator('[data-testid="save"]').click({ force: true });
        await expect(page.locator('[data-testid="out"]')).toHaveText(
          "Saved Ada Lovelace",
        );

        // Client-point hit: center of the name input must focus that control.
        const box = await name.boundingBox();
        expect(box).not.toBeNull();
        await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
        const focused = await page.evaluate(
          () => document.activeElement?.getAttribute("data-testid"),
        );
        expect(focused).toBe("name");
      }
    } finally {
      await vanillaPage.close();
      await reactPage.close();
    }
  });

  test("host metrics and layer ids match", async ({ browser }) => {
    const vanillaPage = await browser.newPage();
    const reactPage = await browser.newPage();
    try {
      await boot(vanillaPage, VANILLA);
      await boot(reactPage, REACT);

      const snap = async (page: Page) =>
        page.evaluate(() => {
          const s = window.__figment.host.state();
          return {
            backend: s.backend,
            health: s.health,
            layerIds: s.layers.map((l) => l.id).sort(),
            canvasGrid: s.canvasGrid,
            unitScale: s.unitScale,
          };
        });

      const a = await snap(vanillaPage);
      const b = await snap(reactPage);
      expect(b).toEqual(a);
    } finally {
      await vanillaPage.close();
      await reactPage.close();
    }
  });
});
