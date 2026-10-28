/**
 * M5e — design-tool vertical on the real stack:
 *  - @figment/host: createHost → admit → mount → layer → exportPng
 *  - @figment/gpu: glass composite preview (ior/dispersion + pointer light)
 *  - Frames are live HTML inside content="drawable" (not fake DOM chrome).
 */
import {
  createHost,
  FigmentUnsupportedError,
  runPixelProbe,
  type Host,
  type LayerHandle,
} from "@figment/host";
import {
  createDirectComposite,
  pointerEmitter,
  type CompositeBackend,
} from "@figment/gpu";
import {
  installTokenStyles,
  registerVirtualList,
  registerCommandPalette,
  registerToast,
  type FigmentVirtualList,
  type FigmentCommandPalette,
  type FigmentToast,
} from "@figment/ui";

installTokenStyles(document);
registerVirtualList();
registerCommandPalette();
registerToast();

const status = document.getElementById("status")!;
const surface = document.getElementById("surface") as HTMLCanvasElement;
const glassPreview = document.getElementById(
  "glass-preview",
) as HTMLCanvasElement;
const layersList = document.getElementById("layers") as FigmentVirtualList;
const palette = document.getElementById("palette") as FigmentCommandPalette;
const toast = document.getElementById("toast") as FigmentToast;

function report(kind: "ok" | "err" | "", text: string) {
  status.textContent = text;
  status.className = kind;
}

// —— Frames: real HTML children of the drawable stage ——
interface FrameEl {
  el: HTMLElement;
  handle: LayerHandle;
  x: number;
  y: number;
  z: number;
}

const frames: FrameEl[] = [];
let selected: FrameEl | null = null;
let seq = 1;
let host: Host | null = null;
let glass: CompositeBackend | null = null;
let light = pointerEmitter(0.5, 0.5, 1);
let glassOn = true;

function makeFrame(id: string, x: number, y: number, z: number): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  el.setAttribute("drawable", "");
  el.dataset.testid = id;
  el.style.cssText = [
    "position:absolute",
    `left:${x}px;top:${y}px`,
    "width:260px;height:150px",
    "padding:16px;border-radius:14px;box-sizing:border-box",
    "background:rgba(22,30,48,0.95);color:#eef2ff",
    "font:14px system-ui;border:1px solid rgba(255,255,255,0.12)",
  ].join(";");
  el.innerHTML = `<strong style="display:block;font-size:15px;margin-bottom:6px">${id}</strong>
    <p style="margin:0;opacity:0.8;font-size:13px">Live HTML in the drawable canvas — hits + export via host.</p>
    <input data-testid="field-${id}" value="${id}" style="width:100%;margin-top:10px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:inherit;font:inherit;box-sizing:border-box" />`;
  return el;
}

function refreshLayers(): void {
  layersList.setLabels(frames.map((f) => f.el.id));
}

function selectFrame(f: FrameEl): void {
  selected = f;
  (document.getElementById("insp-name") as HTMLInputElement).value = f.el.id;
  (document.getElementById("insp-material") as HTMLInputElement).value =
    f.el.dataset.material ?? "relief";
  (document.getElementById("insp-z") as HTMLInputElement).value = String(f.z);
  drawGlassPreview();
}

function addFrame(label?: string): void {
  if (!host) return;
  const n = seq++;
  const id = label ?? `frame-${n}`;
  const x = 48 + (n % 3) * 280;
  const y = 48 + Math.floor(n / 3) * 180;
  const z = n * 10;
  const el = makeFrame(id, x, y, z);
  surface.append(el);
  const handle = host.layer(el, {
    id,
    drawAt: { x, y },
    transform: { x, y, z },
    preserveHitTestOrder: true,
  });
  const f: FrameEl = { el, handle, x, y, z };
  frames.push(f);
  selectFrame(f);
  refreshLayers();
  toast.show(1500);
}

// —— Host surface ——
async function boot(): Promise<void> {
  report("", "probing HTML-in-Canvas…");
  try {
    await runPixelProbe();
  } catch (e) {
    report("err", e instanceof Error ? e.message : String(e));
    return;
  }

  try {
    host = createHost(surface, { backend: "2d" });
  } catch (e) {
    if (e instanceof FigmentUnsupportedError) {
      report("err", `${e.reason}: ${e.message}`);
      return;
    }
    throw e;
  }
  await host.admit();
  host.mount(surface);

  addFrame("brief");
  addFrame("tokens");
  addFrame("export");
  await host.paintOnce();

  const s = host.state();
  report(
    "ok",
    `host ok · ${s.backend} · paints=${s.metrics.paints} · layers=${s.layers.length}`,
  );

  // Glass preview (GPU composite) — selected frame + pointer light.
  try {
    glass = createDirectComposite(glassPreview);
  } catch (e) {
    report("err", e instanceof Error ? e.message : String(e));
    return;
  }
  void warmGlass();
}

async function warmGlass(): Promise<void> {
  // drawable attribute is required for texElementSubImage2D
  for (let i = 0; i < 16; i++) {
    drawGlassPreview();
    await new Promise((r) => setTimeout(r, 80));
  }
  if (glass) {
    report(
      "ok",
      `host + glass ready · composite=${glass.kind} · move pointer on preview`,
    );
  }
}

function drawGlassPreview(): void {
  if (!glass || !selected) return;
  const src = selected.el;
  src.setAttribute("drawable", "");
  const r = src.getBoundingClientRect();
  const pr = glassPreview.getBoundingClientRect();
  void pr;
  try {
    glass.draw({
      width: glassPreview.clientWidth || 480,
      height: glassPreview.clientHeight || 160,
      layers: [
        {
          element: src,
          x: 16,
          y: 16,
          width: Math.min(280, Math.max(40, Math.round(r.width))),
          height: Math.min(120, Math.max(30, Math.round(r.height))),
          material: glassOn
            ? {
                kind: "glass",
                ior: 1.32,
                tint: "#c8d8ff",
                dispersion: 0.28,
                frost: 0.2,
              }
            : { kind: "relief", bevel: 0.15, depth: 0.4 },
          emitters: [light],
          protectedText: [
            { x: 0.05, y: 0.45, width: 0.9, height: 0.5, strength: 0.85 },
          ],
        },
      ],
    });
  } catch {
    // warm-up retries until paint records exist
  }
}

glassPreview.addEventListener("pointermove", (e) => {
  const r = glassPreview.getBoundingClientRect();
  light = pointerEmitter(
    Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
    Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    1.15,
  );
  drawGlassPreview();
});

// —— Inspector ——
for (const id of ["insp-name", "insp-material", "insp-z"]) {
  document.getElementById(id)?.addEventListener("change", () => {
    if (!selected || !host) return;
    const name = (document.getElementById("insp-name") as HTMLInputElement).value;
    const mat = (document.getElementById("insp-material") as HTMLInputElement).value;
    const z = Number((document.getElementById("insp-z") as HTMLInputElement).value);
    if (name && name !== selected.el.id) {
      selected.el.id = name;
      selected.el.querySelector("strong")!.textContent = name;
    }
    selected.el.dataset.material = mat;
    selected.z = Number.isFinite(z) ? z : 0;
    selected.handle.setTransform({ z: selected.z });
    host.invalidate(selected.handle);
    refreshLayers();
    drawGlassPreview();
  });
}

// —— Toolbar ——
document.getElementById("btn-add")?.addEventListener("click", () => addFrame());
document.getElementById("btn-glass")?.addEventListener("click", () => {
  glassOn = !glassOn;
  drawGlassPreview();
  toast.show(glassOn ? 1200 : 1200);
});
document.getElementById("btn-palette")?.addEventListener("click", () => palette.open());

// Export: real host.exportPng() of the HTML-in-Canvas surface
document.getElementById("btn-export")?.addEventListener("click", async () => {
  if (!host) return;
  report("", "exporting via host.exportPng…");
  try {
    const blob = await host.exportPng();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "figment-design-tool.png";
    a.click();
    URL.revokeObjectURL(a.href);
    report("ok", `exported PNG · ${blob.size} bytes`);
    toast.show(1800);
  } catch (e) {
    report("err", e instanceof Error ? e.message : String(e));
  }
});

palette.setCommands([
  { id: "add", label: "Add frame", shortcut: "⌘N" },
  { id: "glass", label: "Toggle glass material" },
  { id: "export", label: "Export PNG via host", shortcut: "⌘E" },
]);
palette.addEventListener("figment-command", (e) => {
  const id = (e as CustomEvent<{ id: string }>).detail.id;
  if (id === "add") addFrame();
  else if (id === "glass") {
    glassOn = !glassOn;
    drawGlassPreview();
  } else if (id === "export")
    (document.getElementById("btn-export") as HTMLButtonElement).click();
});

declare global {
  interface Window {
    __designTool: {
      addFrame: typeof addFrame;
      refreshLayers: typeof refreshLayers;
      frames: () => { id: string; x: number; y: number; z: number }[];
      getHost: () => Host | null;
      getGlass: () => CompositeBackend | null;
      drawGlassPreview: typeof drawGlassPreview;
    };
  }
}
window.__designTool = {
  addFrame,
  refreshLayers,
  frames: () =>
    frames.map((f) => ({
      id: f.el.id,
      x: f.x,
      y: f.y,
      z: f.z,
    })),
  getHost: () => host,
  getGlass: () => glass,
  drawGlassPreview,
};

void boot();
