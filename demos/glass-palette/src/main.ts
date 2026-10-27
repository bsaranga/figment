/**
 * M4i — glass-palette demo: ⌘K palette + glass / relief materials showcase.
 */
import {
  installTokenStyles,
  registerCommandPalette,
  registerSpatialPanel,
  registerToast,
  type FigmentCommandPalette,
  type FigmentToast,
  type FigmentSpatialPanel,
} from "@figment/ui";

installTokenStyles(document);
registerCommandPalette();
registerSpatialPanel();
registerToast();

const palette = document.getElementById("palette") as FigmentCommandPalette;
const toast = document.getElementById("toast") as FigmentToast;
const glassPanel = document.getElementById("glass-panel") as FigmentSpatialPanel;
const reliefPanel = document.getElementById("relief-panel") as FigmentSpatialPanel;

palette.setCommands([
  { id: "focus-name", label: "Focus project name", shortcut: "⌘F" },
  { id: "toggle-glass", label: "Toggle glass material" },
  { id: "toast", label: "Show toast", shortcut: "⌘T" },
  { id: "reset", label: "Reset materials" },
]);

palette.addEventListener("figment-command", (e) => {
  const cmd = (e as CustomEvent<{ id: string }>).detail;
  if (cmd.id === "focus-name") {
    document.getElementById("project")?.focus();
  } else if (cmd.id === "toggle-glass") {
    glassPanel.material = glassPanel.material === "glass" ? "relief" : "glass";
  } else if (cmd.id === "toast") {
    toast.show(2200);
  } else if (cmd.id === "reset") {
    glassPanel.material = "glass";
    reliefPanel.material = "relief";
  }
});

document.getElementById("open-pal")?.addEventListener("click", () => palette.open());
document.getElementById("flip-glass")?.addEventListener("click", () => {
  glassPanel.material = glassPanel.material === "glass" ? "relief" : "glass";
});
document.getElementById("show-toast")?.addEventListener("click", () => toast.show(2200));

declare global {
  interface Window {
    __glassPalette: {
      palette: FigmentCommandPalette;
      toast: FigmentToast;
      glassPanel: FigmentSpatialPanel;
    };
  }
}
window.__glassPalette = { palette, toast, glassPanel };
