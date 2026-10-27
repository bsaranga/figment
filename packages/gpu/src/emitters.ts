/**
 * M3g — emitters / pointer light.
 * Lights relight captured HTML **without recapture** — only uniforms update.
 * Protected text rects (M3h) will clamp light on copy.
 */

export interface Emitter {
  /** Stable id (e.g. "pointer", "lamp-1"). */
  id: string;
  /** Position in layer UV space (0..1). */
  x: number;
  y: number;
  /** Light color (linear-ish 0..1). */
  r: number;
  g: number;
  b: number;
  /** Intensity multiplier. Default 1. */
  intensity?: number;
  /** Falloff radius in UV units. Default 0.45. */
  radius?: number;
}

export interface ResolvedEmitter {
  id: string;
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
  radius: number;
}

/** Max lights per layer in one pass. */
export const MAX_EMITTERS = 4;

export function resolveEmitter(e: Emitter): ResolvedEmitter {
  return {
    id: e.id,
    x: clamp(e.x, -1, 2),
    y: clamp(e.y, -1, 2),
    r: clamp(e.r, 0, 1),
    g: clamp(e.g, 0, 1),
    b: clamp(e.b, 0, 1),
    intensity: clamp(e.intensity ?? 1, 0, 4),
    radius: clamp(e.radius ?? 0.45, 0.05, 2),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export function resolveEmitters(list: Emitter[]): ResolvedEmitter[] {
  if (!Array.isArray(list)) return [];
  if (list.length > MAX_EMITTERS) {
    return list.slice(0, MAX_EMITTERS).map(resolveEmitter);
  }
  return list.map(resolveEmitter);
}

/** GLSL: up to 4 point lights applied as additive relight (no pixel move). */
export const EMITTER_GLSL = `
// M3g: point lights / pointer — uniforms only, no recapture.
vec4 figmentLight(vec4 c, vec2 uv, vec3 lightSum) {
  // Relight: scale RGB by light, keep alpha (material contract: no pixel move).
  return vec4(c.rgb * lightSum, c.a);
}
`;

export function lightUniformGlsl(resolved: ResolvedEmitter[]): string {
  // Build a constant light sum expression from baked emitter params.
  const terms = resolved.map((e) => {
    const dx = `(${e.x.toFixed(4)} - uv.x)`;
    const dy = `(${e.y.toFixed(4)} - uv.y)`;
    const d2 = `(${dx} * ${dx} + ${dy} * ${dy})`;
    const fall = `exp(-${d2} / max(${(e.radius * e.radius).toFixed(6)}, 1e-4))`;
    return `vec3(${e.r.toFixed(4)}, ${e.g.toFixed(4)}, ${e.b.toFixed(4)}) * (${e.intensity.toFixed(4)} * ${fall})`;
  });
  if (terms.length === 0) {
    return `c = figmentLight(c, uv, vec3(1.0));`;
  }
  return `c = figmentLight(c, uv, vec3(1.0) + (${terms.join(" + ")}));`;
}

const emittersByLayer = new Map<string, ResolvedEmitter[]>();

export function setEmitters(layerId: string, list: Emitter[]): ResolvedEmitter[] {
  const resolved = resolveEmitters(list);
  emittersByLayer.set(layerId, resolved);
  return resolved;
}

export function getEmitters(layerId: string): ResolvedEmitter[] {
  return emittersByLayer.get(layerId) ?? [];
}

export function clearEmitters(): void {
  emittersByLayer.clear();
}

/** Convenience: pointer light emitter at UV coords. */
export function pointerEmitter(u: number, v: number, intensity = 1): Emitter {
  return {
    id: "pointer",
    x: u,
    y: v,
    r: 1,
    g: 0.95,
    b: 0.85,
    intensity,
    radius: 0.55,
  };
}
