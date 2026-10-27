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

export {
  resolveStage,
  setStage,
  getStage,
  clearStageMaterials,
  stageCallGlsl,
  STAGE_GLSL,
  type StageDesc,
  type ResolvedStage,
} from "./materials/stage.js";

export {
  resolveGlass,
  setGlass,
  getGlass,
  clearGlassMaterials,
  glassCallGlsl,
  GLASS_GLSL,
  GLASS_REFRACTION_MAX,
  type GlassDesc,
  type ResolvedGlass,
} from "./materials/glass.js";

export {
  setEmitters,
  getEmitters,
  clearEmitters,
  resolveEmitter,
  resolveEmitters,
  pointerEmitter,
  lightUniformGlsl,
  EMITTER_GLSL,
  MAX_EMITTERS,
  type Emitter,
  type ResolvedEmitter,
} from "./emitters.js";

export {
  setProtectedText,
  getProtectedText,
  clearProtectedText,
  resolveProtectedRect,
  resolveProtectedRects,
  protectLightGlsl,
  protectGlassGlsl,
  PROTECT_LIGHT_MIN,
  PROTECT_LIGHT_MAX,
  type ProtectedRect,
  type ResolvedProtectedRect,
} from "./protected-text.js";

export {
  transition,
  transitionGroup,
  startMotionLoop,
  sampleMotion,
  ease,
  IDENTITY_FRAME,
  DEFAULT_MOTION,
  type MotionDesc,
  type MotionFrame,
  type MotionHandle,
  type MotionItem,
  type MotionChannel,
  type EasingName,
} from "./motion/transition.js";

export {
  presence,
  DEFAULT_ENTER,
  DEFAULT_EXIT,
  DISSOLVE_EXIT,
  type PresenceOptions,
  type PresenceHandle,
} from "./motion/presence.js";
