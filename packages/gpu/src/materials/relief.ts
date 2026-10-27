/**
 * M3d — relief material (bevel / depth).
 * Interaction contract: **material** mode — brightness factor only,
 * never moves pixels (safe on live controls / real text).
 */
import { FigmentUnsupportedError } from "@figment/host";

export interface ReliefDesc {
  kind: "relief";
  /** Bevel width as a fraction of the smaller UV edge (0..0.5). Default 0.12. */
  bevel?: number;
  /** Extrusion depth strength (0..1). Default 0.35. */
  depth?: number;
}

export interface ResolvedRelief {
  kind: "relief";
  bevel: number;
  depth: number;
  /**
   * Brightness multiplier applied to content (clamped so text contrast holds).
   * Computed from bevel/depth — never exceeds RELIEF_BRIGHTNESS_RANGE.
   */
  brightness: number;
}

/** Keep content legible: brightness stays within ±12%. */
export const RELIEF_BRIGHTNESS_RANGE = { min: 0.88, max: 1.12 } as const;

export function resolveRelief(desc: ReliefDesc): ResolvedRelief {
  const bevel = clamp(desc.bevel ?? 0.12, 0, 0.5);
  const depth = clamp(desc.depth ?? 0.35, 0, 1);
  // Stronger bevel/depth lightens the face slightly so embossed edges read
  // without crushing body text.
  const raw = 1 + (bevel * 0.4 + depth * 0.08);
  const brightness = clamp(
    raw,
    RELIEF_BRIGHTNESS_RANGE.min,
    RELIEF_BRIGHTNESS_RANGE.max,
  );
  return { kind: "relief", bevel, depth, brightness };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/** GLSL lib for the relief pass (brightness factor + edge bevel). */
export const RELIEF_GLSL = `
// M3d relief: bevel highlight/shadow on the UV border, brightness-safe.
vec4 figmentRelief(vec4 c, vec2 uv, float bevel, float depth, float brightness) {
  vec2 d = min(uv, vec2(1.0) - uv);
  float edge = min(d.x, d.y);
  float band = smoothstep(0.0, max(bevel, 1e-4), edge);
  // Top/left lighter, bottom/right darker — reads as extrusion.
  float light = (1.0 - band) * (1.0 - depth) * 0.35 - (1.0 - band) * depth * 0.2;
  float factor = brightness + light;
  // Hard clamp: never destroy contrast of live text.
  factor = clamp(factor, ${RELIEF_BRIGHTNESS_RANGE.min.toFixed(2)}, ${RELIEF_BRIGHTNESS_RANGE.max.toFixed(2)});
  return vec4(c.rgb * factor, c.a);
}
`;

export function reliefCallGlsl(resolved: ResolvedRelief): string {
  return `c = figmentRelief(c, uv, ${resolved.bevel.toFixed(4)}, ${resolved.depth.toFixed(4)}, ${resolved.brightness.toFixed(4)});`;
}

/** Material registry (one material per layer id). */
export interface MaterialState {
  relief?: ResolvedRelief;
}

const materials = new Map<string, MaterialState>();

export function setRelief(layerId: string, desc: ReliefDesc): ResolvedRelief {
  if (!layerId) {
    throw new FigmentUnsupportedError("probe-failed", "setRelief: layerId required");
  }
  const resolved = resolveRelief(desc);
  const prev = materials.get(layerId) ?? {};
  materials.set(layerId, { ...prev, relief: resolved });
  return resolved;
}

export function getMaterial(layerId: string): MaterialState | undefined {
  return materials.get(layerId);
}

export function clearMaterials(): void {
  materials.clear();
}
