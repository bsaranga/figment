/**
 * M5f — game-hud vertical:
 *  - @figment/host: HTML-in-Canvas HUD (admit → mount → layer → exportPng)
 *  - @figment/ui: <figment-hud> metrics + live region, world-space panel
 *  - @figment/gpu: emitters / pointer light (relight without recapture)
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
import {
  installTokenStyles,
  registerHud,
  registerWorldSpacePanel,
  type FigmentHud,
  type FigmentWorldSpacePanel,
} from "@figment/ui";

installTokenStyles(document);
registerHud();
registerWorldSpacePanel();

const status = document.getElementById("status")!;
const stage = document.getElementById("stage") as HTMLCanvasElement;
const lightPreview = document.getElementById(
  "light-preview",
) as HTMLCanvasElement;

function report(kind: "ok" | "err" | "", text: string) {
  status.textContent = text;
  status.className = kind;
}

let host: Host | null = null;
let composite: CompositeBackend | null = null;
let light = pointerEmitter(0.7, 0.35, 1.2);
let hp = 100;
let ammo = 30;

function buildHud(): { hud: FigmentHud; panel: FigmentWorldSpacePanel } {
  const hud = document.createElement("figment-hud") as FigmentHud;
  hud.id = "game-hud";
  hud.setAttribute("drawable", "");
  hud.style.cssText = "position:absolute;left:24px;top:24px;width:520px;";
  hud.setMetrics([
    { id: "hp", label: "HP", value: String(hp) },
    { id: "ammo", label: "Ammo", value: String(ammo) },
    { id: "fps", label: "FPS", value: "60" },
  ]);
  hud.innerHTML = `<button type="button" slot="actions" data-testid="hud-pause">Pause</button>`;

  const panel = document.createElement(
    "figment-world-space-panel",
  ) as FigmentWorldSpacePanel;
  panel.id = "quest-panel";
  panel.setAttribute("drawable", "");
  panel.setAttribute("x", "620");
  panel.setAttribute("y", "40");
  panel.setAttribute("z", "-80");
  panel.innerHTML = `<span slot="title">Quest</span><p data-testid="quest">Secure the uplink</p>`;

  stage.append(hud, panel);
  return { hud, panel };
}

function drawLightPreview(): void {
  if (!composite) return;
  try {
    const el = lightPreview.querySelector("[data-testid=glow]") as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    composite.draw({
      width: lightPreview.clientWidth || 420,
      height: lightPreview.clientHeight || 220,
      layers: [
        {
          element: el,
          x: 20,
          y: 20,
          width: Math.round(r.width),
          height: Math.round(r.height),
          material: { kind: "relief", bevel: 0.12, depth: 0.5 },
          emitters: [light],
          protectedText: [{ x: 0.08, y: 0.2, width: 0.84, height: 0.5, strength: 0.9 }],
        },
      ],
    });
  } catch {
    // warm-up
  }
}

async function boot(): Promise<void> {
  report("", "probing HTML-in-Canvas…");
  try {
    await runPixelProbe();
  } catch (e) {
    report("err", e instanceof Error ? e.message : String(e));
    return;
  }

  const { hud, panel } = buildHud();

  try {
    host = createHost(stage, { backend: "2d" });
  } catch (e) {
    if (e instanceof FigmentUnsupportedError) {
      report("err", `${e.reason}: ${e.message}`);
      return;
    }
    throw e;
  }
  await host.admit();
  host.mount(stage);
  host.layer(hud, {
    id: "game-hud",
    drawAt: { x: 24, y: 24 },
    preserveHitTestOrder: true,
  });
  host.layer(panel, {
    id: "quest-panel",
    drawAt: { x: 620, y: 40 },
    preserveHitTestOrder: true,
  });
  await host.paintOnce();

  // Live metrics (AT: polite announcements)
  let tick = 0;
  setInterval(() => {
    tick++;
    hud.updateMetric("fps", String(58 + (tick % 5)));
    host?.invalidate();
  }, 1000);

  hud.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t?.dataset?.testid === "hud-pause") {
      report("ok", "paused · HUD still announced to AT");
    }
  });

  const s = host.state();
  report(
    "ok",
    `HUD live · host=${s.backend} · paints=${s.metrics.paints} · protected copy on`,
  );

  // GPU relight preview
  const glow = document.createElement("div");
  glow.setAttribute("data-testid", "glow");
  glow.setAttribute("drawable", "");
  glow.style.cssText = [
    "width:320px;height:140px;border-radius:18px",
    "background:linear-gradient(135deg,#1b2a44,#0e1522)",
    "color:#eef2ff;font:14px system-ui;padding:18px;box-sizing:border-box",
    "border:1px solid rgba(255,255,255,0.14)",
  ].join(";");
  glow.innerHTML = `<strong style="display:block;margin-bottom:8px">Emitter lamp</strong>
    <span data-testid="glow-label">Relight without recapture</span>`;
  lightPreview.append(glow);

  try {
    composite = createDirectComposite(lightPreview);
  } catch (e) {
    report("err", e instanceof Error ? e.message : String(e));
    return;
  }
  for (let i = 0; i < 12; i++) {
    drawLightPreview();
    await new Promise((r) => setTimeout(r, 80));
  }
  report("ok", "HUD + emitters ready · move pointer on the relight preview");
}

lightPreview.addEventListener("pointermove", (e) => {
  const r = lightPreview.getBoundingClientRect();
  light = pointerEmitter(
    Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
    Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    1.25,
  );
  drawLightPreview();
});

document.getElementById("btn-damage")?.addEventListener("click", () => {
  hp = Math.max(0, hp - 12);
  const hud = document.getElementById("game-hud") as FigmentHud | null;
  hud?.updateMetric("hp", String(hp));
  host?.invalidate();
  report("ok", `HP ${hp} · announced via role=status`);
});

document.getElementById("btn-ammo")?.addEventListener("click", () => {
  ammo = 30;
  const hud = document.getElementById("game-hud") as FigmentHud | null;
  hud?.updateMetric("ammo", String(ammo));
  host?.invalidate();
  report("ok", `Ammo ${ammo}`);
});

document.getElementById("btn-export")?.addEventListener("click", async () => {
  if (!host) return;
  const blob = await host.exportPng();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "figment-game-hud.png";
  a.click();
  URL.revokeObjectURL(a.href);
  report("ok", `exported game-hud.png · ${blob.size} bytes`);
});

declare global {
  interface Window {
    __gameHud: {
      getHost: () => Host | null;
      getComposite: () => CompositeBackend | null;
      getHp: () => number;
      getAmmo: () => number;
    };
  }
}
window.__gameHud = {
  getHost: () => host,
  getComposite: () => composite,
  getHp: () => hp,
  getAmmo: () => ammo,
};

void boot();
