/**
 * figment surface runtime — public entry.
 * See ARCHITECTURE.md §3 and PLAN.md M1.
 */
export { FigmentUnsupportedError, EnrollmentError, PaintTimeoutError, } from "./errors.js";
export { inspectSupport, assertSupport } from "./support.js";
export { IDENTITY_AFFINE, IDENTITY_TRANSFORM, composeAffine, applyAffine, multiplyAffine, determinant, isInvertible, invertAffine, computeUnitScale, cssToCanvas, canvasToCss, } from "./geometry.js";
export { DEFAULT_TRANSFORM, } from "./types.js";
export { SIDE_EFFECT_ATTRIBUTES } from "./mutations.js";
export { runPixelProbe, assertPixelProbe, runHitProbe, assertHitProbe, runAdmission, assertAdmission, parseHexColor, colorMatches, PROBE_COLOR, HIT_PROBE_ID, } from "./admission.js";
export { createHost } from "./host.js";
export const VERSION = "0.1.0";
export { composeTiltMatrix, tiltToCss, cornersInFront, tiltFacingViewer, clampTiltDeg, toDOMMatrix, witnessTilt, DEFAULT_PERSPECTIVE, MAX_TILT_DEG, } from "./tilt.js";
export { defaultCamera, depthScale, viewZ, clipReason, isVisible, projectPoint, layerCssTransform3D, resolveNear, resolveFar, viewDistance, DEFAULT_PERSPECTIVE as CAMERA_DEFAULT_PERSPECTIVE, } from "./camera.js";
//# sourceMappingURL=index.js.map