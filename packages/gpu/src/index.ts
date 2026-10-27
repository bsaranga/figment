/**
 * figment GPU framework — public entry (stub).
 * See ARCHITECTURE.md §4 and PLAN.md M3.
 */

export type { EffectDesc } from "./composite.js";

export type MaterialDesc =
  | { kind: "relief"; bevel?: number; depth?: number }
  | { kind: "stage" }
  | {
      kind: "glass";
      ior?: number;
      tint?: string;
      dispersion?: number;
    };

/** Safety contract for effects vs live controls. */
export type InteractionMode = "decorative" | "inert" | "material";

export const GPU_VERSION = "0.0.0";

export {
  MAX_EFFECT_OPS,
  validateEffectChain,
  buildEffectGlsl,
  type EffectDesc as CompositeEffectDesc,
  type CompositeBackend,
  type CompositeFrameInput,
  type CompositeLayerInput,
} from "./composite.js";
export {
  createWebGLComposite,
  createDirectComposite,
  createWebGLComposite as createComposite,
} from "./backend-webgl-composite.js";

export {
  defineEffect,
  compileEffect,
  compileEffectOnGPU,
  validateEffectDefinition,
  getEffect,
  listEffects,
  clearEffects,
  clampParam,
  extractExpression,
  type EffectDefinition,
  type EffectParamSpec,
  type CompiledEffect,
} from "./effects/schema.js";

export {
  resolveRelief,
  setRelief,
  getMaterial,
  clearMaterials,
  reliefCallGlsl,
  RELIEF_GLSL,
  RELIEF_BRIGHTNESS_RANGE,
  type ReliefDesc,
  type ResolvedRelief,
  type MaterialState,
} from "./materials/relief.js";
