import type { Vec2 } from "./geometry.js";
import type { AdmissionReport } from "./admission.js";

export type HostBackend = "2d" | "webgl" | "webgpu";

export interface CreateHostOptions {
  backend: HostBackend;
  devicePixelRatio?: number;
  budgets?: {
    layers?: number;
    pixels?: number;
  };
  /** paintOnce / admission timeout (ms). Default 2000. */
  paintTimeoutMs?: number;
}

export type TransformOrigin =
  | "top-left"
  | "center"
  | { x: number; y: number };

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  /** Degrees, clockwise. */
  rotation: number;
  opacity: number;
}

export interface Tilt {
  x: number;
  y: number;
  perspective?: number;
}

export interface LayerOpts {
  id?: string;
  transform?: Partial<LayerTransform>;
  /** M2: projective tilt. Non-zero tilt throws tilt-unsupported until M2f. */
  tilt?: Tilt;
  origin?: TransformOrigin;
  /** M2d: clip viewport in CSS px (canvasClip). */
  clip?: DOMRect;
  decorative?: boolean;
  /** Draw dest rect in canvas-grid px; default = element layout size × unit scale. */
  drawAt?: { x: number; y: number };
  /**
   * M2d: keep hit-test order stable across redraws (default true).
   * Without this, a background repaint steals clicks (last-drawn-wins).
   */
  preserveHitTestOrder?: boolean;
}

export interface GeometryUpdate {
  canvasTransform?: DOMMatrix;
  canvasClip?: DOMRect | null;
  preserveHitTestOrder?: boolean;
}

export interface LayerHandle {
  readonly id: string;
  readonly element: Element;
  setTransform(t: Partial<LayerTransform>): void;
  setOrigin(o: TransformOrigin): void;
  /** M2d: set/clear the layer clip viewport. */
  setClip(clip: DOMRect | null): void;
  /** M2d: sync canonical geometry (transform + clip) to the browser hit stack. */
  updateGeometry(g: GeometryUpdate): void;
  invalidate(): void;
  dispose(): void;
}

export interface HostState {
  backend: HostBackend;
  health: "idle" | "pending" | "healthy" | "failed";
  supported: boolean;
  /**
   * M2c seamless first enable: true while the host canvas is still hidden
   * (opacity 0) waiting for a complete first frame. False after swap.
   */
  pendingEnable: boolean;
  canvasGrid: Vec2;
  cssSize: Vec2;
  unitScale: Vec2;
  layers: { id: string; dirty: boolean }[];
  /** M2a+M2b functional admission (pixel + hit); null until `host.admit()` runs. */
  admission: AdmissionReport | null;
  metrics: {
    paints: number;
    layersDrawn: number;
    dirtyRedraws: number;
    mutationsIgnored: number;
    inputCaptures: number;
    nestedCanvasMarks: number;
    skippedFrames: number;
    /** M2c: seamless swaps performed (0 until first complete frame reveals). */
    seamlessSwaps: number;
    /** M2d: updateElementGeometry / clearElementGeometry calls. */
    geometryUpdates: number;
    geometryClears: number;
    /** M2g: tilt admission witnesses. */
    tiltWitnesses: number;
    tiltWitnessFailures: number;
  };
  lastError?: string;
}

export interface Host {
  mount(root: ParentNode): () => void;
  layer(el: Element, opts?: LayerOpts): LayerHandle;
  /**
   * M2a+M2b: functional admission (pixel readback + elementFromPoint hit probe).
   * Throws {@link FigmentUnsupportedError} `probe-failed` — no fallback.
   */
  admit(): Promise<AdmissionReport>;
  requestPaint(): void;
  invalidate(layer?: LayerHandle): void;
  paintOnce(): Promise<void>;
  /** M2d: sync geometry to the browser hit stack (clip, transform, order). */
  updateGeometry(id: string, g: GeometryUpdate): void;
  /** M2d: drop browser hit/a11y geometry for a layer (on retire). */
  clearGeometry(id: string): void;
  cssToCanvas(n: number, axis?: "x" | "y"): number;
  canvasToCss(n: number, axis?: "x" | "y"): number;
  clientToCanvas(p: Vec2): Vec2;
  state(): HostState;
  destroy(): Promise<void>;
}

export const DEFAULT_TRANSFORM: LayerTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
};
