import { expect, test } from "@playwright/test";

/**
 * M4d acceptance: layer stack depth order + minimap world overview.
 */

test.describe("M4d layer stack + minimap", () => {
  test("layer stack orders panels bottom → top", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerLayerStack();

      const stack = document.createElement("figment-layer-stack") as HTMLElement & {
        layers: { id: string; z: number }[];
        raise: (el: HTMLElement) => void;
        lower: (el: HTMLElement) => void;
        setIndex: (el: HTMLElement, i: number) => void;
      };
      document.body.append(stack);

      const a = document.createElement("div");
      a.id = "a";
      const b = document.createElement("div");
      b.id = "b";
      const c = document.createElement("div");
      c.id = "c";
      stack.append(a, b, c);

      const order1 = stack.layers.map((l) => l.id);
      stack.raise(a);
      const order2 = stack.layers.map((l) => l.id);
      stack.lower(a);
      const order3 = stack.layers.map((l) => l.id);
      stack.setIndex(c, 1);
      const order4 = stack.layers.map((l) => l.id);
      const zTop = (stack.children[stack.children.length - 1] as HTMLElement).style
        .zIndex;

      stack.remove();
      return { order1, order2, order3, order4, zTop };
    });

    expect(result.order1).toEqual(["a", "b", "c"]);
    expect(result.order2).toEqual(["b", "c", "a"]);
    expect(result.order3).toEqual(["a", "b", "c"]);
    expect(result.order4).toEqual(["a", "c", "b"]);
    expect(Number(result.zTop)).toBeGreaterThan(1);
  });

  test("minimap draws items + viewport and emits jump", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerMinimap();

      const map = document.createElement("figment-minimap") as HTMLElement & {
        setItems: (i: unknown[]) => void;
        setView: (v: unknown) => void;
        draw: () => void;
        items: unknown[];
        view: { x: number; y: number; width: number; height: number };
      };
      map.style.cssText = "width:200px;height:120px;position:fixed;left:0;top:0;";
      document.body.append(map);

      map.setItems([
        { id: "p1", x: 0, y: 0, width: 100, height: 80 },
        { id: "p2", x: 200, y: 40, width: 120, height: 60 },
      ]);
      map.setView({ x: 0, y: 0, width: 400, height: 300 });
      map.draw();

      const canvas = map.shadowRoot!.querySelector("canvas") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 3; i < px.length; i += 4) if ((px[i] ?? 0) > 0) painted++;

      let jump: { x: number; y: number } | null = null;
      map.addEventListener("figment-minimap-jump", (e) => {
        jump = (e as CustomEvent).detail;
      });
      const r = map.getBoundingClientRect();
      map.dispatchEvent(
        new MouseEvent("click", {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          bubbles: true,
        }),
      );

      const itemCount = map.items.length;
      const view = map.view;
      map.remove();
      return { painted, jump, itemCount, view };
    });

    expect(result.itemCount).toBe(2);
    expect(result.painted).toBeGreaterThan(0);
    expect(result.view.width).toBe(400);
    expect(result.jump).not.toBeNull();
  });
});
