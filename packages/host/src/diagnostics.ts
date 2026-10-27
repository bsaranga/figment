import type { HostBackend, HostState } from "./types.js";
import type { Vec2 } from "./geometry.js";
import type { AdmissionReport } from "./admission.js";

export interface Metrics {
  paints: number;
  layersDrawn: number;
  dirtyRedraws: number;
  mutationsIgnored: number;
  inputCaptures: number;
  nestedCanvasMarks: number;
  skippedFrames: number;
}

export function createMetrics(): Metrics {
  return {
    paints: 0,
    layersDrawn: 0,
    dirtyRedraws: 0,
    mutationsIgnored: 0,
    inputCaptures: 0,
    nestedCanvasMarks: 0,
    skippedFrames: 0,
  };
}

export function buildState(input: {
  backend: HostBackend;
  health: HostState["health"];
  supported: boolean;
  canvasGrid: Vec2;
  cssSize: Vec2;
  unitScale: Vec2;
  layers: { id: string; dirty: boolean }[];
  admission: AdmissionReport | null;
  metrics: Metrics;
  lastError?: string;
}): HostState {
  const state: HostState = {
    backend: input.backend,
    health: input.health,
    supported: input.supported,
    canvasGrid: input.canvasGrid,
    cssSize: input.cssSize,
    unitScale: input.unitScale,
    layers: input.layers,
    admission: input.admission,
    metrics: { ...input.metrics },
  };
  if (input.lastError !== undefined) state.lastError = input.lastError;
  return state;
}
