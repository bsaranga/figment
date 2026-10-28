/**
 * Promo live demos — bundled into docs/ for GitHub Pages.
 * Real HTML-in-Canvas: @figment/host + @figment/gpu (glass refraction).
 */
import {
  createHost,
  runPixelProbe,
  type Host,
  FigmentUnsupportedError,
} from "@figment/host";
import {
  createDirectComposite,
  pointerEmitter,
  type CompositeBackend,
} from "@figment/gpu";

type DemoKind = "host" | "glass";

interface DemoInstance {
  kind: DemoKind;
  host?: Host;
  composite?: CompositeBackend;
}

function report(el: HTMLElement | null, kind: "ok" | "err" | "", text: string) {
  if (!el) return;
  el.textContent = text;
  el.className = kind;
}

function makeCard(title: string, body: string, withInput: boolean): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("drawable", "");
  el.style.cssText = [
    "position:absolute;left:28px;top:28px;width:min(320px,70%)",
    "padding:20px;border-radius:18px;box-sizing:border-box",
    "background:rgba(18,24,40,0.92);color:#eef2ff",
    "font:14px system-ui;border:1px solid rgba(255,255,255,0.14)",
    "backdrop-filter:blur(12px)",
  ].join(";");
  el.innerHTML = `<strong style="display:block;font-size:17px;letter-spacing:-0.02em;margin-bottom:8px">${title}</strong>
    <p style="margin:0;opacity:0.82;line-height:1.5">${body}</p>
    ${withInput ? `<input data-demo-input value="Type here" aria-label="Demo input in canvas" style="width:100%;margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.16);background:rgba(0,0,0,0.28);color:inherit;font:inherit;box-sizing:border-box" />` : ""}`;
  return el;
}

async function bootHostDemo(canvas: HTMLCanvasElement, status: HTMLElement) {
  report(status, "", "admitting HTML-in-Canvas…");
  try {
    await runPixelProbe();
  } catch (e) {
    report(status, "err", e instanceof Error ? e.message : String(e));
    return null;
  }

  const card = makeCard(
    "Surface runtime",
    "Live HTML inside a drawable canvas. Real input, real hits — no screenshot.",
    true,
  );
  const chip = makeCard("exportPng()", "One clean frame → PNG.", false);
  chip.style.left = "auto";
  chip.style.right = "28px";
  chip.style.width = "150px";
  canvas.append(card, chip);

  let host: Host;
  try {
    host = createHost(canvas, { backend: "2d" });
  } catch (e) {
    report(
      status,
      "err",
      e instanceof FigmentUnsupportedError
        ? `${e.reason}: ${e.message}`
        : String(e),
    );
    return null;
  }
  await host.admit();
  host.mount(canvas);
  host.layer(card, { id: "demo-card", drawAt: { x: 28, y: 28 }, preserveHitTestOrder: true });
  host.layer(chip, { id: "demo-chip", preserveHitTestOrder: true });
  await host.paintOnce();

  report(
    status,
    "ok",
    `host ok · backend=${host.state().backend} · paints=${host.state().metrics.paints}`,
  );
  return { kind: "host" as const, host };
}

async function bootGlassDemo(
  canvas: HTMLCanvasElement,
  status: HTMLElement,
): Promise<DemoInstance | null> {
  report(status, "", "starting WebGL glass composite…");
  const card = makeCard(
    "Glass refraction",
    "GPU composite over captured HTML. Pointer light relights without recapture.",
    true,
  );
  canvas.append(card);
  card.setAttribute("drawable", "");

  let composite: CompositeBackend;
  try {
    composite = createDirectComposite(canvas);
  } catch (e) {
    report(status, "err", e instanceof Error ? e.message : String(e));
    return null;
  }

  let light = pointerEmitter(0.6, 0.4, 1.15);
  let drawn = false;

  const draw = () => {
    try {
      const r = card.getBoundingClientRect();
      composite.draw({
        width: canvas.clientWidth || 480,
        height: canvas.clientHeight || 280,
        layers: [
          {
            element: card,
            x: 28,
            y: 28,
            width: Math.round(r.width),
            height: Math.round(r.height),
            material: {
              kind: "glass",
              ior: 1.32,
              tint: "#c8d8ff",
              dispersion: 0.3,
              frost: 0.22,
            },
            emitters: [light],
            protectedText: [{ x: 0.06, y: 0.35, width: 0.88, height: 0.55, strength: 0.88 }],
          },
        ],
      });
      drawn = true;
    } catch {
      // warm-up until paint records exist
    }
  };

  for (let i = 0; i < 16 && !drawn; i++) {
    draw();
    await new Promise((r) => setTimeout(r, 70));
  }

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    light = pointerEmitter(
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
      1.2,
    );
    draw();
    if (drawn) {
      report(status, "ok", "glass live · pointer light moves without recapture");
    }
  });

  if (drawn) {
    report(status, "ok", "glass composite ready · move your pointer");
    return { kind: "glass", composite };
  }
  report(status, "err", "glass draw failed — need HTML-in-Canvas (Chrome 157+)");
  return null;
}

export async function mountPromoDemos(): Promise<void> {
  const hostCanvas = document.getElementById(
    "promo-host-canvas",
  ) as HTMLCanvasElement | null;
  const glassCanvas = document.getElementById(
    "promo-glass-canvas",
  ) as HTMLCanvasElement | null;
  const hostStatus = document.getElementById("promo-host-status");
  const glassStatus = document.getElementById("promo-glass-status");

  const instances: Record<string, DemoInstance | null> = {
    host: null,
    glass: null,
  };

  if (hostCanvas) instances.host = await bootHostDemo(hostCanvas, hostStatus!);
  if (glassCanvas) {
    instances.glass = await bootGlassDemo(glassCanvas, glassStatus!);
  }

  (window as unknown as { __promoDemos?: typeof instances }).__promoDemos =
    instances;
}

// Auto-boot when this bundle loads on the promo page.
if (typeof document !== "undefined" && document.getElementById("promo-host-canvas")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void mountPromoDemos());
  } else {
    void mountPromoDemos();
  }
}
