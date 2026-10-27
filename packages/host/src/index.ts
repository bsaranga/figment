/**
 * figment surface runtime — public entry (stub).
 * See ARCHITECTURE.md §3 and PLAN.md M1.
 */

/** Typed failure modes. figment never degrades silently. */
export type FigmentUnsupportedReason =
  | "missing-api"
  | "probe-failed"
  | "tilt-unsupported";

export class FigmentUnsupportedError extends Error {
  readonly reason: FigmentUnsupportedReason;
  override readonly name = "FigmentUnsupportedError";

  constructor(reason: FigmentUnsupportedReason, detail: string) {
    super(`figment: ${reason}: ${detail}`);
    this.reason = reason;
  }
}

export type HostBackend = "2d" | "webgl" | "webgpu";

export interface CreateHostOptions {
  backend: HostBackend;
  devicePixelRatio?: number;
  budgets?: {
    layers?: number;
    pixels?: number;
  };
}

/**
 * Create a surface host on a canvas.
 * Throws {@link FigmentUnsupportedError} when HTML-in-Canvas is missing — no fallback.
 */
export function createHost(
  target: HTMLCanvasElement | OffscreenCanvas,
  options: CreateHostOptions,
): never {
  void target;
  void options;
  throw new FigmentUnsupportedError(
    "missing-api",
    "createHost is not implemented yet (M1). Install Chrome Canary with HTML-in-Canvas flags.",
  );
}

export {
  type Affine,
  type Vec2,
  type LayerTransform,
  IDENTITY_AFFINE,
  IDENTITY_TRANSFORM,
  composeAffine,
  applyAffine,
  multiplyAffine,
  determinant,
  isInvertible,
  invertAffine,
  computeUnitScale,
  cssToCanvas,
  canvasToCss,
} from "./geometry.js";

export const VERSION = "0.0.0";
