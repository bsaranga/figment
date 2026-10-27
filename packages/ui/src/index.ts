/**
 * figment spatial UI kit — public entry (stub).
 * See ARCHITECTURE.md §5 and PLAN.md M4–M5.
 */

export type TransformOrigin =
  | "top-left"
  | "center"
  | { x: number; y: number };

export const UI_VERSION = "0.0.0";

/** Element names reserved for the kit (M4+). */
export const KIT_ELEMENTS = [
  "figment-infinite-canvas",
  "figment-spatial-panel",
  "figment-layer-stack",
  "figment-minimap",
  "figment-command-palette",
  "figment-modal",
  "figment-toast",
  "figment-context-menu",
  "figment-tooltip",
  "figment-virtual-list",
  "figment-virtual-grid",
  "figment-hud",
  "figment-world-space-panel",
] as const;

export type KitElementName = (typeof KIT_ELEMENTS)[number];

export {
  DEFAULT_TOKENS,
  resolveTokens,
  tokensToCss,
  tokenVar,
  applyTokens,
  getToken,
  installTokenStyles,
  type FigmentTokens,
  type PartialTokens,
  type TokenGroup,
} from "./tokens.js";

export {
  FigmentSpatialPanel,
  registerSpatialPanel,
  type PanelMaterial,
  type SpatialPanelState,
} from "./spatial-panel.js";

export {
  FigmentZScroll,
  registerZScroll,
  type ZScrollState,
} from "./z-scroll.js";

export {
  FigmentInfiniteCanvas,
  registerInfiniteCanvas,
  type CanvasView,
} from "./infinite-canvas.js";

export {
  FigmentLayerStack,
  registerLayerStack,
  type LayerEntry,
} from "./layer-stack.js";
export {
  FigmentMinimap,
  registerMinimap,
  type MinimapItem,
  type MinimapView,
} from "./minimap.js";

export {
  FigmentCommandPalette,
  registerCommandPalette,
  type CommandItem,
  type PaletteOpenDetail,
} from "./command-palette.js";

export {
  FigmentModal,
  registerModal,
} from "./modal.js";
export {
  FigmentToast,
  registerToast,
} from "./toast.js";

export {
  FigmentContextMenu,
  registerContextMenu,
  type MenuItem,
} from "./context-menu.js";
export {
  FigmentTooltip,
  registerTooltip,
} from "./tooltip.js";
