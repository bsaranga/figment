import { expect, test } from "@playwright/test";

/**
 * M2h acceptance: WebGL + WebGPU backends draw the same scene as 2D.
 */

type BackendName = "2d" | "webgl" | "webgpu";

async function bootScene(page: import("@playwright/test").Page, backend: BackendName) {
  await page.goto("/admission-probe.html");
  await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
    timeout: 10_000,
  });

  return page.evaluate(async (backendName: string) => {
    const { createHost } = window.__admission;

    const stage = document.createElement("canvas");
    stage.width = 320;
    stage.height = 220;
    stage.setAttribute("content", "drawable");
    stage.style.cssText =
      "width:320px;height:220px;position:fixed;left:0;top:0;z-index:2147483000;background:#eee;";
    document.body.append(stage);

    const card = document.createElement("button");
    card.id = "backend-card";
    card.textContent = "card";
    card.style.cssText =
      "position:absolute;left:40px;top:40px;width:160px;height:100px;background:#c23f53;border:0;";
    stage.append(card);

    let host: ReturnType<typeof createHost>;
    try {
      host = createHost(stage, {
        backend: backendName as "2d" | "webgl" | "webgpu",
      });
    } catch (e) {
      stage.remove();
      return {
        threw: true,
        name: (e as Error).name,
        reason: (e as { reason?: string }).reason,
        message: (e as Error).message,
      };
    }

    try {
      await host.admit();
      host.mount(stage);
      host.setCamera({ z: 0, perspective: 800, origin: { x: 160, y: 110 } });
      const layer = host.layer(card, {
        id: "backend-card",
        transform: { x: 40, y: 40, z: 40 },
        drawAt: { x: 40, y: 40 },
        origin: "center",
        preserveHitTestOrder: true,
      });
      await host.paintOnce();
      // WebGPU configure is async — give it a frame.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await host.paintOnce();

      const rect = card.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );

      const state = host.state();
      layer.dispose();
      await host.destroy();
      stage.remove();

      return {
        threw: false,
        backend: state.backend,
        health: state.health,
        paints: state.metrics.paints,
        layersDrawn: state.metrics.layersDrawn,
        hitId: hit?.id || hit?.tagName.toLowerCase() || null,
      };
    } catch (e) {
      await host.destroy().catch(() => {});
      stage.remove();
      return {
        threw: true,
        name: (e as Error).name,
        reason: (e as { reason?: string }).reason,
        message: (e as Error).message,
      };
    }
  }, backend);
}

test.describe("M2h WebGL + WebGPU backends", () => {
  test("2D reference scene draws and hits", async ({ page }) => {
    const result = await bootScene(page, "2d");
    expect(result.threw).toBe(false);
    expect(result.paints).toBeGreaterThan(0);
    expect(result.hitId).toBe("backend-card");
  });

  test("WebGL draws the same scene with texElementSubImage2D", async ({
    page,
  }) => {
    const result = await bootScene(page, "webgl");
    // WebGL must actually draw in this harness (Chrome + HTML-in-Canvas).
    expect(result.threw).toBe(false);
    expect(result.backend).toBe("webgl");
    expect(result.health).toBe("healthy");
    expect(result.paints).toBeGreaterThan(0);
    expect(result.layersDrawn).toBeGreaterThan(0);
    expect(result.hitId).toBe("backend-card");
  });

  test("WebGPU draws the same scene with drawElementImageToTexture", async ({
    page,
  }) => {
    const result = await bootScene(page, "webgpu");
    if (result.threw) {
      // Fail-fast is correct when the browser lacks WebGPU element upload.
      expect(result.name).toBe("FigmentUnsupportedError");
      expect(result.reason).toBe("missing-api");
      return;
    }
    expect(result.backend).toBe("webgpu");
    expect(result.health).toBe("healthy");
    expect(result.paints).toBeGreaterThan(0);
    expect(result.layersDrawn).toBeGreaterThan(0);
    expect(result.hitId).toBe("backend-card");
  });

  test("all available backends agree on hit target", async ({ browser }) => {
    const hits: Record<string, string | null> = {};
    for (const backend of ["2d", "webgl", "webgpu"] as BackendName[]) {
      const page = await browser.newPage();
      const result = await bootScene(page, backend);
      await page.close();
      if (!result.threw) hits[backend] = result.hitId ?? null;
    }
    const values = Object.values(hits);
    expect(values.length).toBeGreaterThanOrEqual(1);
    for (const id of values) expect(id).toBe("backend-card");
  });
});
