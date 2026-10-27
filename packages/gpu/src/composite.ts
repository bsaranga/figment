/**
 * M3a — GPU composite: one pass per layer, direct element→texture upload.
 * No staging 2D canvas. Shader budget ≤3 chained ops (ARCHITECTURE §4.3).
 */
import { FigmentUnsupportedError } from "@figment/host";
import { getEffect, clampParam } from "./effects/schema.js";

/** Maximum chained pixel-moving effects per layer. */
export const MAX_EFFECT_OPS = 3;

export type EffectDesc =
  | { kind: "ripple"; amplitude: number; edge?: number }
  | { kind: "chromatic"; offset: number }
  | { kind: "dissolve"; progress: number }
  | { kind: "custom"; id: string; params: Record<string, number> };

export interface CompositeLayerInput {
  element: Element;
  /** Dest rect in canvas CSS px. */
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  effects?: EffectDesc[];
}

export interface CompositeFrameInput {
  layers: CompositeLayerInput[];
  width: number;
  height: number;
}

export interface CompositeBackend {
  readonly kind: "webgl" | "webgpu";
  /** Direct upload + per-layer draw. Returns layers painted. */
  draw(frame: CompositeFrameInput): number;
  dispose(): void;
}

/**
 * Validate an effect chain (shader budget + known kinds).
 * Throws when the chain cannot be compiled into a single pass.
 */
export function validateEffectChain(effects: EffectDesc[]): EffectDesc[] {
  if (effects.length > MAX_EFFECT_OPS) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `effect chain length ${effects.length} exceeds shader budget (${MAX_EFFECT_OPS})`,
    );
  }
  for (const e of effects) {
    switch (e.kind) {
      case "ripple":
        if (!Number.isFinite(e.amplitude)) {
          throw new FigmentUnsupportedError("probe-failed", "ripple.amplitude must be finite");
        }
        break;
      case "chromatic":
        if (!Number.isFinite(e.offset)) {
          throw new FigmentUnsupportedError("probe-failed", "chromatic.offset must be finite");
        }
        break;
      case "dissolve":
        if (e.progress < 0 || e.progress > 1) {
          throw new FigmentUnsupportedError("probe-failed", "dissolve.progress must be 0..1");
        }
        break;
      case "custom": {
        if (!e.id) {
          throw new FigmentUnsupportedError("probe-failed", "custom effect requires id");
        }
        const pub = getEffect(e.id);
        if (!pub) {
          throw new FigmentUnsupportedError(
            "probe-failed",
            `custom effect "${e.id}" is not defined — call defineEffect first`,
          );
        }
        for (const [k, v] of Object.entries(e.params ?? {})) {
          const spec = pub.params.find((p) => p.name === k);
          if (spec) clampParam(spec, v);
        }
        break;
      }
      default: {
        const kind = (e as { kind?: string }).kind;
        throw new FigmentUnsupportedError("probe-failed", `unknown effect kind: ${kind}`);
      }
    }
  }
  return effects;
}

/**
 * Glue GLSL for up to 3 ops (M3b fills real sampling; M3a ships the pass).
 * Kept as pure string assembly so unit tests can assert the budget.
 */
export function buildEffectGlsl(effects: EffectDesc[]): string {
  const chain = validateEffectChain(effects);
  const body = chain
    .map((e, i) => {
      const src = i === 0 ? "base" : `c${i}`;
      const dst = `c${i + 1}`;
      switch (e.kind) {
        case "ripple":
          return `vec4 ${dst} = figmentRipple(${src}, ${e.amplitude.toFixed(4)});`;
        case "chromatic":
          return `vec4 ${dst} = figmentChromatic(${src}, ${e.offset.toFixed(4)});`;
        case "dissolve":
          return `vec4 ${dst} = figmentDissolve(${src}, ${e.progress.toFixed(4)});`;
        case "custom":
          return `vec4 ${dst} = figmentCustom_${sanitizeId(e.id)}(${src});`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n  ");
  const last = chain.length === 0 ? "base" : `c${chain.length}`;
  return `vec4 figmentApplyEffects(vec4 base) {\n  ${body}${body ? "\n  " : ""}return ${last};\n}`;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}
