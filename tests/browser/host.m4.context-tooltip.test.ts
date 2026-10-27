import { expect, test } from "@playwright/test";

/**
 * M4g acceptance: context menu at pointer + 3D-aware tooltip placement.
 */

test.describe("M4g context menu + tooltip", () => {
  test("context menu opens at point, navigates, selects", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerContextMenu();

      const menu = document.createElement("figment-context-menu") as HTMLElement & {
        setItems: (i: unknown[]) => void;
        openAt: (x: number, y: number) => void;
        close: () => void;
        isOpen: boolean;
        selected: () => { id: string } | null;
        confirm: () => { id: string } | null;
      };
      document.body.append(menu);
      menu.setItems([
        { id: "rename", label: "Rename" },
        { id: "dup", label: "Duplicate", shortcut: "⌘D" },
        { separator: true },
        { id: "del", label: "Delete" },
      ]);

      const events: string[] = [];
      menu.addEventListener("figment-menu-select", (e) => {
        events.push((e as CustomEvent).detail.id);
      });

      menu.openAt(120, 80);
      const open = menu.isOpen;
      const left = menu.style.left;
      const top = menu.style.top;

      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      const second = menu.selected()?.id;
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
      const first = menu.selected()?.id;
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      const closed = !menu.isOpen;

      menu.remove();
      return { open, left, top, second, first, closed, events };
    });

    expect(result.open).toBe(true);
    expect(result.left).toBe("120px");
    expect(result.top).toBe("80px");
    expect(result.first).toBe("rename");
    expect(result.second).toBe("dup");
    expect(result.closed).toBe(true);
    expect(result.events).toContain("rename");
  });

  test("tooltip is 3D-aware (follows transformed target rect)", async ({
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
      ui.registerTooltip();
      ui.registerSpatialPanel();

      const panel = document.createElement("figment-spatial-panel") as HTMLElement;
      panel.style.cssText = "position:fixed;left:200px;top:120px;";
      panel.setAttribute("rotate-x", "18");
      panel.setAttribute("rotate-y", "-12");
      panel.setAttribute("z", "40");
      panel.innerHTML = `<span slot="title">Tilted</span>`;
      document.body.append(panel);

      const tip = document.createElement("figment-tooltip") as HTMLElement & {
        showFor: (t: HTMLElement, p?: string) => void;
        hide: () => void;
        isOpen: boolean;
        reflow: (p?: string) => void;
      };
      tip.textContent = "I track the projected box";
      document.body.append(tip);

      tip.showFor(panel, "top");
      const r = panel.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const tipX = parseFloat(tip.style.left);
      const tipY = parseFloat(tip.style.top);

      // Centered above the 3D-projected AABB.
      const expectedX = r.left + r.width / 2 - tw / 2;
      const expectedY = r.top - th - 10;
      const nearX = Math.abs(tipX - expectedX) < 2;
      const nearY = Math.abs(tipY - expectedY) < 2;
      const open = tip.isOpen;

      tip.hide();
      panel.remove();
      tip.remove();

      return { open, nearX, nearY, hasLeft: tip.style.left !== "" };
    });

    expect(result.open).toBe(true);
    expect(result.nearX).toBe(true);
    expect(result.nearY).toBe(true);
    expect(result.hasLeft).toBe(true);
  });
});
