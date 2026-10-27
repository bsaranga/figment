/**
 * figment surface runtime — public entry.
 * See ARCHITECTURE.md §3 and PLAN.md M1.
 */

export {
  FigmentUnsupportedError,
  EnrollmentError,
  PaintTimeoutError,
  type FigmentUnsupportedReason,
} from "./errors.js";

export { inspectSupport, assertSupport, type SupportReport } from "./support.js";

export {
  type Affine,
  type Vec2,
  type LayerTransform as GeometryLayerTransform,
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

export {
  type Host,
  type HostBackend,
  type HostState,
  type CreateHostOptions,
  type LayerHandle,
  type LayerOpts,
  type LayerTransform,
  type TransformOrigin,
  type Tilt,
  DEFAULT_TRANSFORM,
} from "./types.js";

export { SIDE_EFFECT_ATTRIBUTES } from "./mutations.js";

export { createHost } from "./host.js";

export const VERSION = "0.1.0";
