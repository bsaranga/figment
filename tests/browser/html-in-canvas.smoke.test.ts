import { expect, test } from "@playwright/test";

/**
 * M0c acceptance: one browser test draws a `drawable` div into a canvas.
 * Skips when HTML-in-Canvas is not available (wrong browser / flags).
 */

const PAGE = /* html */ `<!doctype html>
<meta charset="utf-8">
<title>figment smoke</title>
<canvas id="c" width="400" height="200" content="drawable"
        style="width:400px;height:200px;background:#eee"></canvas>
<div id="probe">status</div>
<script>
  const canvas = document.getElementById("c");
  const probe = document.getElementById("probe");

  const supported = canvas.content === "drawable";
  probe.dataset.supported = supported ? "yes" : "no";

  if (!supported) {
    probe.textContent = "html-in-canvas: missing";
  } else {
    const el = document.createElement("div");
    el.setAttribute("drawable", "");
    el.id = "card";
    el.style.cssText =
      "width:120px;height:40px;background:#c23f53;color:white;font:14px system-ui;padding:8px;box-sizing:border-box";
    el.textContent = "figment";
    canvas.appendChild(el);

    const ctx = canvas.getContext("2d");
    canvas.addEventListener("paint", () => {
      ctx.reset();
      ctx.drawElementImage(el, 40, 40);
      probe.dataset.drawn = "yes";
    });
    canvas.requestPaint();
  }
</script>`;

test("draws a drawable div into a 2D canvas", async ({ page }) => {
  await page.setContent(PAGE);
  const probe = page.locator("#probe");
  await expect(probe).toHaveAttribute("data-supported", "yes", {
    timeout: 5_000,
  });
  await expect(probe).toHaveAttribute("data-drawn", "yes", { timeout: 5_000 });

  // Snapshot: canvas must not be a flat empty rect (top-left probe pixel from the red card).
  const hit = await page.evaluate(() => {
    const c = document.getElementById("c") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    // card drawn at (40,40) size 120x40 — sample its center
    const { data } = ctx.getImageData(100, 60, 1, 1);
    return Array.from(data);
  });
  // c23f53 ≈ rgb(194, 63, 83) — allow AA slack
  expect(hit[0]).toBeGreaterThan(150);
  expect(hit[1]).toBeLessThan(120);
});

test("smoke page reports support without throwing", async ({ page }) => {
  await page.setContent(PAGE);
  await expect(page.locator("#probe")).not.toHaveText("error");
});
