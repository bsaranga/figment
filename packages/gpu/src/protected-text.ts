/**
 * M3h — protected text rects.
 * Copy stays readable under light/glass: lighting multipliers are clamped
 * inside these UV rects so contrast never collapses.
 */

export interface ProtectedRect {
  /** UV rect in layer space (0..1). */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * How much to dampen light deviation (0 = none, 1 = full protect).
   * Default 0.85.
   */
  strength?: number;
}

export interface ResolvedProtectedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;
}

/** Min allowed light multiplier inside a protected rect. */
export const PROTECT_LIGHT_MIN = 0.75;
/** Max allowed light multiplier inside a protected rect. */
export const PROTECT_LIGHT_MAX = 1.35;

export function resolveProtectedRect(r: ProtectedRect): ResolvedProtectedRect {
  const x = clamp(r.x, -1, 2);
  const y = clamp(r.y, -1, 2);
  const width = clamp(r.width, 0, 2);
  const height = clamp(r.height, 0, 2);
  return {
    x,
    y,
    width,
    height,
    strength: clamp(r.strength ?? 0.85, 0, 1),
  };
}

export function resolveProtectedRects(list: ProtectedRect[]): ResolvedProtectedRect[] {
  if (!Array.isArray(list)) return [];
  // Hard cap — enough for a HUD caption + title + tooltip.
  return list.slice(0, 8).map(resolveProtectedRect);
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * GLSL that tames a light multiplier near protected copy.
 * `lightMul` is a scalar or vec3 factor about to be applied to RGB.
 */
export function protectLightGlsl(rects: ResolvedProtectedRect[]): string {
  if (rects.length === 0) return "";
  const tests = rects
    .map((r) => {
      return `float _p${r.x.toFixed(3)}_${r.y.toFixed(3)} = step(${r.x.toFixed(4)}, uv.x) * step(uv.x, ${(r.x + r.width).toFixed(4)}) * step(${r.y.toFixed(4)}, uv.y) * step(uv.y, ${(r.y + r.height).toFixed(4)}) * ${r.strength.toFixed(4)};`;
    })
    .join("\n  ");
  const maxes = rects
    .map((r) => `_p${r.x.toFixed(3)}_${r.y.toFixed(3)}`)
    .join(", ");
  return `
  ${tests}
  float _protect = max(${maxes}, 0.0);
  lightMul = mix(lightMul, clamp(lightMul, ${PROTECT_LIGHT_MIN.toFixed(3)}, ${PROTECT_LIGHT_MAX.toFixed(3)}), _protect);
`;
}

/** Tame glass refraction/dispersion inside protected copy. */
export function protectGlassGlsl(rects: ResolvedProtectedRect[]): string {
  if (rects.length === 0) return "";
  const tests = rects
    .map(
      (r) =>
        `step(${r.x.toFixed(4)}, uv.x) * step(uv.x, ${(r.x + r.width).toFixed(4)}) * step(${r.y.toFixed(4)}, uv.y) * step(uv.y, ${(r.y + r.height).toFixed(4)}) * ${r.strength.toFixed(4)}`,
    )
    .join(", ");
  return `
  float _protectGlass = max(${tests}, 0.0);
  refraction *= (1.0 - _protectGlass * 0.85);
  dispersion *= (1.0 - _protectGlass * 0.9);
`;
}

const byLayer = new Map<string, ResolvedProtectedRect[]>();

export function setProtectedText(
  layerId: string,
  rects: ProtectedRect[],
): ResolvedProtectedRect[] {
  const resolved = resolveProtectedRects(rects);
  byLayer.set(layerId, resolved);
  return resolved;
}

export function getProtectedText(layerId: string): ResolvedProtectedRect[] {
  return byLayer.get(layerId) ?? [];
}

export function clearProtectedText(): void {
  byLayer.clear();
}
