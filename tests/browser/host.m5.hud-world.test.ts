import { expect, test } from "@playwright/test";

/**
 * M5c acceptance: accessible game HUD + world-space panel in scene z.
 */

test.describe("M5c HUD + world-space panel", () => {
  test("HUD announces metric updates and stays accessible", async ({
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
      ui.registerHud();

      const hud = document.createElement("figment-hud") as HTMLElement & {
        setMetrics: (m: unknown[]) => void;
        updateMetric: (id: string, v: string) => void;
        metrics: { id: string; label: string; value: string }[];
        protectedRect: () => unknown;
      };
      document.body.append(hud);
      hud.setMetrics([
        { id: "hp", label: "HP", value: "100" },
        { id: "ammo", label: "Ammo", value: "30" },
      ]);

      const role = hud.getAttribute("role");
      const label = hud.getAttribute("aria-label");
      const metricCount = hud.metrics.length;

      const updates: string[] = [];
      hud.addEventListener("figment-hud-update", (e) => {
        updates.push((e as CustomEvent).detail.value);
      });
      hud.updateMetric("hp", "80");

      const live = hud.shadowRoot!.getElementById("live")!;
      const liveText = live.textContent;
      const liveRole = live.getAttribute("aria-live");
      const hp = hud.metrics.find((m) => m.id === "hp")?.value;
      const rect = hud.protectedRect();

      hud.remove();
      return { role, label, metricCount, liveText, liveRole, hp, rect, updates };
    });

    expect(result.role).toBe("region");
    expect(result.label).toBe("Game HUD");
    expect(result.metricCount).toBe(2);
    expect(result.hp).toBe("80");
    expect(result.liveText).toContain("HP");
    expect(result.liveText).toContain("80");
    expect(result.liveRole).toBe("polite");
    expect(result.updates).toContain("80");
    expect(result.rect).toHaveProperty("width");
  });

  test("world-space panel moves in scene z", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerWorldSpacePanel();

      const panel = document.createElement(
        "figment-world-space-panel",
      ) as HTMLElement & {
        position: { x: number; y: number; z: number };
      };
      panel.innerHTML = `<span slot="title">Quest</span><p>Defeat the dragon</p>`;
      document.body.append(panel);
      panel.position = { x: 120, y: 80, z: -240 };

      const pos = panel.position;
      const transform = panel.style.transform;
      const role = panel.getAttribute("role");

      panel.remove();
      return { pos, transform, role };
    });

    expect(result.pos.x).toBe(120);
    expect(result.pos.z).toBe(-240);
    expect(result.transform).toContain("translate3d(120px, 80px, -240px)");
    expect(result.role).toBe("group");
  });
});
