import { expect, test } from "@playwright/test";

/**
 * M4b acceptance: figment-spatial-panel is draggable, tiltable, z-aware,
 * and supports relief/glass material presets.
 */

test.describe("M4b spatial panel", () => {
  test("panel moves, tilts, and carries scene z", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerSpatialPanel();

      const panel = document.createElement("figment-spatial-panel") as HTMLElement;
      panel.innerHTML = `<span slot="title">Board</span><p>Content</p>`;
      panel.setAttribute("x", "40");
      panel.setAttribute("y", "30");
      panel.setAttribute("z", "80");
      panel.setAttribute("rotate-x", "12");
      panel.setAttribute("rotate-y", "-8");
      panel.setAttribute("material", "glass");
      document.body.append(panel);

      const s = (panel as unknown as { state: Record<string, unknown> }).state;
      const transform = panel.style.transform;
      const material = panel.dataset.material;
      const role = panel.getAttribute("role");
      const tabIndex = panel.tabIndex;

      // Programmatic move (same path as drag).
      (panel as unknown as { state: Record<string, unknown> }).state = {
        x: 100,
        y: 50,
      };
      const s2 = (panel as unknown as { state: Record<string, unknown> }).state;

      // Drag via handle pointer events.
      const handle = panel.shadowRoot!.querySelector(".handle") as HTMLElement;
      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 110,
          clientY: 60,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 1,
          clientX: 160,
          clientY: 90,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1 }),
      );
      const s3 = (panel as unknown as { state: Record<string, unknown> }).state;

      panel.remove();
      return {
        z: s.z,
        rotateX: s.rotateX,
        material,
        transform,
        role,
        tabIndex,
        moved: s2.x === 100 && s2.y === 50,
        dragged: s3.x === 150 && s3.y === 80,
      };
    });

    expect(result.z).toBe(80);
    expect(result.rotateX).toBe(12);
    expect(result.material).toBe("glass");
    expect(result.transform).toContain("translate3d(");
    expect(result.transform).toContain("80px");
    expect(result.transform).toContain("rotateX(12deg)");
    expect(result.role).toBe("group");
    expect(result.tabIndex).toBe(0);
    expect(result.moved).toBe(true);
    expect(result.dragged).toBe(true);
  });

  test("material presets flip relief vs glass", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const kinds = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerSpatialPanel();
      const p = document.createElement("figment-spatial-panel") as HTMLElement & {
        material: string;
        state: Record<string, unknown>;
      };
      document.body.append(p);
      p.material = "relief";
      const relief = p.dataset.material;
      p.material = "glass";
      const glass = p.dataset.material;
      p.remove();
      return { relief, glass };
    });
    expect(kinds.relief).toBe("relief");
    expect(kinds.glass).toBe("glass");
  });
});
