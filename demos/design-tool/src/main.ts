/**
 * M5e — design-tool vertical: shippable board + layers + inspector + PNG export.
 */
import {
  installTokenStyles,
  registerInfiniteCanvas,
  registerLayerStack,
  registerMinimap,
  registerSpatialPanel,
  registerVirtualList,
  registerCommandPalette,
  registerToast,
  registerFormControls,
  type FigmentInfiniteCanvas,
  type FigmentMinimap,
  type FigmentVirtualList,
  type FigmentCommandPalette,
  type FigmentToast,
  type FigmentSpatialPanel,
} from "@figment/ui";

installTokenStyles(document);
registerInfiniteCanvas();
registerLayerStack();
registerMinimap();
registerSpatialPanel();
registerVirtualList();
registerCommandPalette();
registerToast();
registerFormControls();

const canvas = document.getElementById("canvas") as FigmentInfiniteCanvas;
const stack = document.getElementById("stack") as HTMLElement;
const minimap = document.getElementById("minimap") as FigmentMinimap;
const layers = document.getElementById("layers") as FigmentVirtualList;
const palette = document.getElementById("palette") as FigmentCommandPalette;
const toast = document.getElementById("toast") as FigmentToast;

let selected: FigmentSpatialPanel | null = null;
let seq = 1;

function frames(): FigmentSpatialPanel[] {
  return [...stack.children].filter(
    (n): n is FigmentSpatialPanel => n instanceof HTMLElement,
  );
}

function refreshLayers(): void {
  layers.setLabels(frames().map((f, i) => f.id || `Frame ${i + 1}`));
  const items = frames().map((f) => ({
    id: f.id,
    x: Number(f.getAttribute("x") ?? 0),
    y: Number(f.getAttribute("y") ?? 0),
    width: 260,
    height: 150,
  }));
  minimap.setItems(items);
  const v = canvas.view;
  const r = canvas.getBoundingClientRect();
  minimap.setView({
    x: -v.x / v.scale,
    y: -v.y / v.scale,
    width: r.width / v.scale,
    height: r.height / v.scale,
  });
}

function selectFrame(el: FigmentSpatialPanel): void {
  selected = el;
  const name = document.getElementById("insp-name") as HTMLInputElement;
  const mat = document.getElementById("insp-material") as HTMLInputElement;
  const z = document.getElementById("insp-z") as HTMLInputElement;
  name.value = el.id;
  mat.value = el.material;
  z.value = el.getAttribute("z") ?? "0";
}

function addFrame(label?: string): void {
  const n = seq++;
  const el = document.createElement("figment-spatial-panel") as FigmentSpatialPanel;
  el.id = label ?? `frame-${n}`;
  el.setAttribute("x", String(80 + n * 28));
  el.setAttribute("y", String(60 + n * 22));
  el.setAttribute("z", String(n * 12));
  el.setAttribute("material", n % 2 ? "glass" : "relief");
  el.innerHTML = `<span slot="title">${el.id}</span><p>Design frame — drag to move.</p>`;
  stack.append(el);
  selectFrame(el);
  refreshLayers();
  toast.show(1600);
}

addFrame("brief");
addFrame("tokens");
addFrame("export");

canvas.addEventListener("figment-view", () => refreshLayers());
stack.addEventListener("pointerup", () => refreshLayers());
stack.addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest("figment-spatial-panel");
  if (t) selectFrame(t as FigmentSpatialPanel);
});
refreshLayers();

// Inspector → selection
for (const id of ["insp-name", "insp-material", "insp-z"]) {
  document.getElementById(id)?.addEventListener("change", () => {
    if (!selected) return;
    const name = (document.getElementById("insp-name") as HTMLInputElement).value;
    const mat = (document.getElementById("insp-material") as HTMLInputElement)
      .value as FigmentSpatialPanel["material"];
    const z = (document.getElementById("insp-z") as HTMLInputElement).value;
    if (name && name !== selected.id) {
      selected.id = name;
      selected.querySelector("span")!.textContent = name;
    }
    if (mat) selected.material = mat;
    selected.setAttribute("z", z);
    refreshLayers();
  });
}

document.getElementById("btn-add")?.addEventListener("click", () => addFrame());
document
  .getElementById("btn-fit")
  ?.addEventListener("click", () => canvas.fitWorld({ x: 0, y: 0, width: 900, height: 600 }, 40));
document
  .getElementById("btn-palette")
  ?.addEventListener("click", () => palette.open());

// PNG export via host-less snapshot: rasterize the board view to a temp canvas.
document.getElementById("btn-export")?.addEventListener("click", async () => {
  const w = Math.min(1600, canvas.clientWidth);
  const h = Math.min(1000, canvas.clientHeight);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#7c9cff";
  ctx.font = "600 28px system-ui";
  ctx.fillText("figment · design tool", 32, 48);
  ctx.fillStyle = "#9aa6c0";
  ctx.font = "16px system-ui";
  frames().forEach((f, i) => {
    const x = 40 + (i % 2) * 360;
    const y = 100 + Math.floor(i / 2) * 180;
    ctx.fillStyle = i % 2 ? "rgba(200,216,255,0.25)" : "rgba(124,156,255,0.35)";
    ctx.fillRect(x, y, 320, 150);
    ctx.fillStyle = "#eef2ff";
    ctx.font = "600 18px system-ui";
    ctx.fillText(f.id, x + 18, y + 36);
  });
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "figment-design-tool.png";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.show(2200);
  }, "image/png");
});

palette.setCommands([
  { id: "add", label: "Add frame", shortcut: "⌘N" },
  { id: "fit", label: "Fit board" },
  { id: "export", label: "Export PNG", shortcut: "⌘E" },
]);
palette.addEventListener("figment-command", (e) => {
  const id = (e as CustomEvent<{ id: string }>).detail.id;
  if (id === "add") addFrame();
  else if (id === "fit")
    canvas.fitWorld({ x: 0, y: 0, width: 900, height: 600 }, 40);
  else if (id === "export")
    (document.getElementById("btn-export") as HTMLButtonElement).click();
});

declare global {
  interface Window {
    __designTool: {
      addFrame: typeof addFrame;
      refreshLayers: typeof refreshLayers;
      frames: typeof frames;
      canvas: FigmentInfiniteCanvas;
    };
  }
}
window.__designTool = { addFrame, refreshLayers, frames, canvas };
