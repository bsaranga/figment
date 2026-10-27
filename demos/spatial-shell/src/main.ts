/**
 * M4h — spatial-shell demo: Figma-like board with the figment kit.
 */
import {
  registerInfiniteCanvas,
  registerSpatialPanel,
  registerLayerStack,
  registerMinimap,
  registerCommandPalette,
  registerContextMenu,
  registerTooltip,
  registerToast,
  installTokenStyles,
  type FigmentInfiniteCanvas,
  type FigmentMinimap,
  type FigmentCommandPalette,
  type FigmentContextMenu,
  type FigmentTooltip,
  type FigmentToast,
  type FigmentSpatialPanel,
} from "@figment/ui";

installTokenStyles(document);

registerInfiniteCanvas();
registerSpatialPanel();
registerLayerStack();
registerMinimap();
registerCommandPalette();
registerContextMenu();
registerTooltip();
registerToast();

const canvas = document.getElementById("canvas") as FigmentInfiniteCanvas;
const stack = document.getElementById("stack") as HTMLElement;
const minimap = document.getElementById("minimap") as FigmentMinimap;
const palette = document.getElementById("palette") as FigmentCommandPalette;
const menu = document.getElementById("menu") as FigmentContextMenu;
const tip = document.getElementById("tip") as FigmentTooltip;
const toast = document.getElementById("toast") as FigmentToast;

function addPanel(
  id: string,
  title: string,
  body: string,
  x: number,
  y: number,
  z = 0,
  material: "relief" | "glass" | "none" = "relief",
): FigmentSpatialPanel {
  const el = document.createElement("figment-spatial-panel") as FigmentSpatialPanel;
  el.id = id;
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("z", String(z));
  el.setAttribute("material", material);
  el.innerHTML = `<span slot="title">${title}</span><p>${body}</p>`;
  stack.append(el);
  return el;
}

// Seed board
addPanel(
  "brief",
  "Product brief",
  "GPU-native UI with real HTML. Clicks, forms, and screen readers intact.",
  80,
  80,
  0,
  "relief",
);
addPanel(
  "tokens",
  "Design tokens",
  "Themable --figment-* surface. Works in DOM and canvas mode.",
  420,
  120,
  40,
  "glass",
);
addPanel(
  "kit",
  "Spatial kit",
  "Panels, palette, toasts, minimaps — one design system, every stack.",
  220,
  320,
  -20,
  "relief",
);

function refreshMinimap(): void {
  const items = [...stack.children]
    .filter((n): n is FigmentSpatialPanel => n instanceof HTMLElement)
    .map((el) => ({
      id: el.id || "panel",
      x: Number(el.getAttribute("x") ?? 0),
      y: Number(el.getAttribute("y") ?? 0),
      width: 280,
      height: 140,
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

canvas.addEventListener("figment-view", () => refreshMinimap());
stack.addEventListener("pointerup", () => refreshMinimap());
refreshMinimap();

// Commands
palette.setCommands([
  {
    id: "fit",
    label: "Fit board",
    shortcut: "⇧1",
  },
  {
    id: "add",
    label: "Add panel",
    shortcut: "⌘N",
  },
  {
    id: "glass",
    label: "Toggle glass on selection",
    shortcut: "⌘G",
  },
  {
    id: "toast",
    label: "Show welcome toast",
    shortcut: "⌘T",
  },
]);

palette.addEventListener("figment-command", (e) => {
  const cmd = (e as CustomEvent<{ id: string }>).detail;
  if (cmd.id === "fit") {
    canvas.fitWorld({ x: 0, y: 0, width: 800, height: 520 }, 40);
  } else if (cmd.id === "add") {
    const n = stack.children.length + 1;
    addPanel(`p${n}`, `Panel ${n}`, "New spatial note", 120 + n * 24, 100 + n * 18, n * 10);
    refreshMinimap();
  } else if (cmd.id === "glass") {
    const first = stack.firstElementChild as FigmentSpatialPanel | null;
    if (first) {
      first.material = first.material === "glass" ? "relief" : "glass";
    }
  } else if (cmd.id === "toast") {
    toast.show(2400);
  }
});

// Context menu on board
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  menu.setItems([
    { id: "add", label: "Add panel here", shortcut: "⌘N" },
    { id: "fit", label: "Fit board", shortcut: "⇧1" },
    { separator: true },
    { id: "zoom-in", label: "Zoom in" },
    { id: "zoom-out", label: "Zoom out" },
  ]);
  menu.openAt(e.clientX, e.clientY);
});

menu.addEventListener("figment-menu-select", (e) => {
  const item = (e as CustomEvent<{ id: string; }>).detail;
  if (item.id === "add") {
    palette.setCommands([
      { id: "add", label: "Add panel", shortcut: "⌘N" },
    ]);
    palette.open();
  } else if (item.id === "fit") {
    canvas.fitWorld({ x: 0, y: 0, width: 800, height: 520 }, 40);
  } else if (item.id === "zoom-in") {
    const v = canvas.view;
    canvas.zoomAt(window.innerWidth / 2, window.innerHeight / 2, v.scale * 1.2);
  } else if (item.id === "zoom-out") {
    const v = canvas.view;
    canvas.zoomAt(window.innerWidth / 2, window.innerHeight / 2, v.scale / 1.2);
  }
});

// Tooltip on panels
for (const el of stack.querySelectorAll("figment-spatial-panel")) {
  el.addEventListener("pointerenter", () => {
    tip.showFor(el as HTMLElement, "top");
  });
  el.addEventListener("pointerleave", () => tip.hide());
}

// Expose for Playwright / debugging
declare global {
  interface Window {
    __spatialShell: {
      canvas: FigmentInfiniteCanvas;
      minimap: FigmentMinimap;
      palette: FigmentCommandPalette;
      addPanel: typeof addPanel;
      refreshMinimap: typeof refreshMinimap;
    };
  }
}
window.__spatialShell = { canvas, minimap, palette, addPanel, refreshMinimap };
