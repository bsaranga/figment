/**
 * M5 vertical — HTML-in-Canvas + glass refraction.
 * Uses the real stack:
 *  - @figment/host: createHost → admit → mount → layer → exportPng
 *  - @figment/gpu: WebGL composite, glass material (ior/dispersion), emitters
 *  - Live HTML children inside content="drawable" canvases
 */
import {
  createHost,
  FigmentUnsupportedError,
  runPixelProbe,
  type Host,
} from "@figment/host";
import {
  createDirectComposite,
  pointerEmitter,
  type CompositeBackend,
} from "@figment/gpu";

const status = document.getElementById("status")!;
const glassStatus = document.getElementById("glass-status")!;
const hostStage = document.getElementById("host-stage") as HTMLCanvasElement;
const glassStage = document.getElementById("glass-stage") as HTMLCanvasElement;

function report(el: HTMLElement, kind: "ok" | "err" | "", text: string) {
  el.textContent = text;
  el.className = kind;
}

// —— Shared live HTML builders (both surfaces use real DOM in drawable canvas) ——
function makePanel(id: string, title: string, body: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = [
    "position:absolute;left:24px;top:24px;width:280px",
    "padding:18px;border-radius:16px",
    "background:rgba(20,28,44,0.92);color:#eef2ff",
    "font:14px system-ui;box-sizing:border-box",
  ].join(";");
  el.innerHTML = `<strong style="display:block;margin-bottom:8px;font-size:16px">${title}</strong>
    <p style="margin:0 0 12px;opacity:0.8">${body}</p>
    <label style="display:block;font-size:12px;opacity:0.75">Project
      <input data-testid="project" value="Aurora" style="width:100%;margin-top:4px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:inherit;font:inherit;box-sizing:border-box" />
    </label>`;
  return el;
}

function makeStrip(label: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:absolute;right:24px;top:24px;width:160px",
    "padding:14px;border-radius:14px",
    "background:rgba(124,156,255,0.22);color:#fff",
    "font:13px system-ui;border:1px solid rgba(255,255,255,0.18)",
    "box-sizing:border-box",
  ].join(";");
  el.textContent = label;
  return el;
}

// ===================== Host surface (HTML-in-Canvas runtime) =====================
let host: Host | null = null;

let hostBooted = false;

async function bootHost(): Promise<void> {
  if (hostBooted || host) return;
  hostBooted = true;
  report(status, "", "probing HTML-in-Canvas…");
  try {
    await runPixelProbe();
  } catch (e) {
    report(status, "err", e instanceof Error ? e.message : String(e));
    return;
  }

  const panel = makePanel(
    "host-panel",
    "Surface runtime",
    "Admitted, mounted, layered. This input is real HTML inside the drawable canvas.",
  );
  const strip = makeStrip("exportPng →");
  panel.setAttribute("drawable", "");
  strip.setAttribute("drawable", "");
  hostStage.append(panel, strip);

  try {
    host = createHost(hostStage, { backend: "2d" });
  } catch (e) {
    if (e instanceof FigmentUnsupportedError) {
      report(status, "err", `${e.reason}: ${e.message}`);
      return;
    }
    throw e;
  }

  await host.admit();
  host.mount(hostStage);
  host.layer(panel, {
    id: "host-panel",
    drawAt: { x: 24, y: 24 },
    preserveHitTestOrder: true,
  });
  host.layer(strip, {
    id: "host-strip",
    drawAt: { x: 536, y: 24 },
    preserveHitTestOrder: true,
  });
  await host.paintOnce();

  const s = host.state();
  report(
    status,
    "ok",
    `host ok · backend=${s.backend} · paints=${s.metrics.paints} · admit pixel=${s.admission?.pixel.ok ? "ok" : "n/a"}`,
  );

  // Keep a live form usable: mutation → repaint
  panel.addEventListener("input", () => host?.invalidate());
}

document.getElementById("btn-export")?.addEventListener("click", async () => {
  if (!host) return;
  report(status, "", "exporting…");
  const blob = await host.exportPng();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "figment-host-surface.png";
  a.click();
  URL.revokeObjectURL(a.href);
  report(status, "ok", `exported host-surface.png (${blob.size} bytes)`);
});

document.getElementById("btn-repaint")?.addEventListener("click", async () => {
  await host?.paintOnce();
  report(status, "ok", "repainted");
});

// ===================== Glass composite (GPU + glass refraction) =====================
let composite: CompositeBackend | null = null;
let dispersion = 0.35;
let light = pointerEmitter(0.55, 0.4, 1.1);

let glassBooted = false;
let glassDrawn = false;
let lastDrawError = "";

async function bootGlass(): Promise<void> {
  if (glassBooted || composite) return;
  glassBooted = true;
  report(glassStatus, "", "starting WebGL composite…");

  const panel = makePanel(
    "glass-panel",
    "Glass refraction",
    "ior + chromatic dispersion + frost over captured HTML. Pointer light moves without recapture.",
  );
  const strip = makeStrip("pointer → light");
  // HTML-in-Canvas contract: descendants must be drawable for texElementSubImage2D.
  panel.setAttribute("drawable", "");
  strip.setAttribute("drawable", "");
  glassStage.append(panel, strip);

  report(glassStatus, "", "creating WebGL composite…");
  try {
    composite = createDirectComposite(glassStage);
    report(glassStatus, "", "first draw…");
  } catch (e) {
    report(glassStatus, "err", e instanceof Error ? e.message : String(e));
    return;
  }

  // Kick a browser paint (drawElementImage needs a paint record).
  const req = (glassStage as HTMLCanvasElement & { requestPaint?: () => void })
    .requestPaint;
  if (typeof req === "function") {
    req.call(glassStage);
    setTimeout(() => req.call(glassStage), 30);
    setTimeout(() => req.call(glassStage), 120);
  }

  const drawGlass = () => {
    if (!composite) return;
    try {
      const pr = panel.getBoundingClientRect();
      const sr = strip.getBoundingClientRect();
      const host = glassStage.getBoundingClientRect();
      const sx = (r: DOMRect) => r.left - host.left;
      const sy = (r: DOMRect) => r.top - host.top;
      const layers = [] as Array<Record<string, unknown>>;
      if (pr.width > 2 && pr.height > 2) {
        layers.push({
          element: panel,
          x: sx(pr),
          y: sy(pr),
          width: Math.round(pr.width),
          height: Math.round(pr.height),
          material: {
            kind: "glass",
            ior: 1.35,
            tint: "#c8d8ff",
            dispersion,
            frost: 0.25,
          },
          emitters: [light],
          protectedText: [
            { x: 0.05, y: 0.55, width: 0.9, height: 0.4, strength: 0.9 },
          ],
        });
      }
      if (sr.width > 2 && sr.height > 2) {
        layers.push({
          element: strip,
          x: sx(sr),
          y: sy(sr),
          width: Math.round(sr.width),
          height: Math.round(sr.height),
          material: {
            kind: "glass",
            ior: 1.2,
            tint: "#e8d8ff",
            dispersion: 0.15,
          },
          emitters: [light],
        });
      }
      if (!layers.length) return;
      composite.draw({
        width: glassStage.clientWidth || 720,
        height: glassStage.clientHeight || 360,
        layers: layers as never,
      });
      glassDrawn = true;
    } catch (e) {
      // Transient "No cached paint record" on first frames is expected —
      // keep trying via pointer/rAF; only surface persistent failure.
      const msg = e instanceof Error ? e.message : String(e);
      lastDrawError = msg;
    }
  };

  // Element paint records can land a few frames late — keep drawing until
  // the compositor actually produces a frame (or we time out).
  // Warm-up in the background — headless GL shader compile can take a beat.
  report(glassStatus, "ok", `glass composite ready · ${composite.kind} · warming up`);
  void (async () => {
    for (let i = 0; i < 20 && !glassDrawn; i++) {
      try {
        drawGlass();
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (glassDrawn) {
      report(glassStatus, "ok", `glass composite ready · ${composite.kind} · move pointer`);
    }
  })();

  glassStage.addEventListener("pointermove", (e) => {
    const r = glassStage.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const v = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    light = pointerEmitter(u, v, 1.15);
    drawGlass();
    if (glassDrawn) {
      report(
        glassStatus,
        "ok",
        `light @ ${u.toFixed(2)},${v.toFixed(2)} · dispersion=${dispersion}`,
      );
    }
  });

  report(
    glassStatus,
    glassDrawn ? "ok" : "err",
    glassDrawn
      ? `glass composite ready · ${composite.kind} · move pointer`
      : `glass composite failed: ${lastDrawError || "no frame"}`,
  );
}

document.getElementById("btn-dispersion")?.addEventListener("click", () => {
  dispersion = dispersion > 0.2 ? 0.12 : 0.45;
  // force redraw via a synthetic move
  glassStage.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 360, clientY: 180 }),
  );
});

document.getElementById("btn-export-glass")?.addEventListener("click", () => {
  const blob = glassStage.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = blob;
  a.download = "figment-glass-surface.png";
  a.click();
  report(glassStatus, "ok", "exported glass-surface.png");
});

declare global {
  interface Window {
    __glassSurface: {
      getHost: () => Host | null;
      getComposite: () => CompositeBackend | null;
      bootHost: () => Promise<void>;
      bootGlass: () => Promise<void>;
    };
  }
}
window.__glassSurface = {
  getHost: () => host,
  getComposite: () => composite,
  bootHost,
  bootGlass,
};

bootHost();
bootGlass();
