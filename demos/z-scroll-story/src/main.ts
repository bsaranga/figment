/**
 * M4h2 — z-scroll-story demo: scroll-into-screen Z fly-through.
 * Panels approach the camera; inputs stay focusable (AT contract).
 */
import {
  installTokenStyles,
  registerSpatialPanel,
  registerZScroll,
  registerToast,
  type FigmentZScroll,
  type FigmentToast,
} from "@figment/ui";

installTokenStyles(document);
registerSpatialPanel();
registerZScroll();
registerToast();

const story = document.getElementById("story") as FigmentZScroll;
const toast = document.getElementById("toast") as FigmentToast | null;

// Expose progress for tests / debugging.
declare global {
  interface Window {
    __zStory: {
      story: FigmentZScroll;
      progress: () => number;
      cameraZ: () => number;
    };
  }
}

function current() {
  const s = story.state ?? story.update();
  return s;
}

window.__zStory = {
  story,
  progress: () => current().progress,
  cameraZ: () => current().cameraZ,
};

story.addEventListener("figment-scroll", () => {
  const s = current();
  // Optional toast at the midpoint (presence demo in a real story).
  if (toast && s.progress > 0.5 && s.progress < 0.52 && !toast.isVisible) {
    toast.show(1800);
  }
});
