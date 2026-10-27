/**
 * M3f — glass material (ior / tint / dispersion).
 * Refractive look over captured HTML. Palette must stay readable:
 * refraction is bounded so text/controls don't melt.
 * Interaction: **material** mode (may sit on live controls — we only
 * resample + tint; no hard alpha cuts on content).
 */
import { FigmentUnsupportedError } from "@figment/host";

export interface GlassDesc {
  kind: "glass";
  /** Index of refraction. 1.0 = flat, ~1.5 = typical glass. Default 1.25. */
  ior?: number;
  /** Tint hex. Default `#c8d8ff` (cool glass). */
  tint?: string;
  /** Chromatic dispersion strength 0..1. Default 0.15. */
  dispersion?: number;
  /** Frost blur-ish strength 0..1 (softens refraction). Default 0.2. */
  frost?: number;
}

export interface ResolvedGlass {
  kind: "glass";
  ior: number;
  tint: { r: number; g: number; b: number };
  dispersion: number;
  frost: number;
  /** How strongly UV is warped — derived from ior, clamped for readability. */
  refraction: number;
}

/** Readability ceiling: refraction never exceeds this UV offset. */
export const GLASS_REFRACTION_MAX = 0.08;

export function resolveGlass(desc: GlassDesc): ResolvedGlass {
  const ior = clamp(desc.ior ?? 1.25, 1, 2.5);
  const tint = parseHex(desc.tint ?? "#c8d8ff");
  const dispersion = clamp(desc.dispersion ?? 0.15, 0, 1);
  const frost = clamp(desc.frost ?? 0.2, 0, 1);
  // ior 1 → no bend; higher ior → stronger, but clamped.
  const refraction = clamp((ior - 1) * 0.12, 0, GLASS_REFRACTION_MAX);
  return { kind: "glass", ior, tint, dispersion, frost, refraction };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const s = hex.replace("#", "").trim();
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `glass.tint must be a hex color, got ${hex}`,
    );
  }
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

/** GLSL: refract UV, optional RGB dispersion, frost, tint. */
export const GLASS_GLSL = `
// M3f glass: bounded refraction + dispersion + tint (text stays readable).
vec2 glassRefractUV(vec2 uv, float ior, float amount) {
  vec2 c = uv - vec2(0.5);
  float r = length(c) + 1e-5;
  // Pseudo-normal: bend toward the edge like a lens.
  float bend = (1.0 / max(ior, 1.0) - 1.0) * amount;
  return uv + (c / r) * bend * r * r;
}

vec4 figmentGlass(
  sampler2D tex,
  vec2 uv,
  float ior,
  float refraction,
  float dispersion,
  float frost,
  vec3 tint
) {
  vec2 baseUV = glassRefractUV(uv, ior, refraction);
  float dsp = dispersion * refraction * 1.5;
  float r = texture2D(tex, glassRefractUV(uv, ior + dsp, refraction)).r;
  vec4 mid = texture2D(tex, baseUV);
  float b = texture2D(tex, glassRefractUV(uv, ior - dsp, refraction)).b;
  // Frost: cheap 4-tap soften.
  vec4 soft = mid;
  if (frost > 0.001) {
    vec2 o = vec2(frost * 0.01);
    soft = (
      texture2D(tex, baseUV + vec2(o.x, 0.0)) +
      texture2D(tex, baseUV - vec2(o.x, 0.0)) +
      texture2D(tex, baseUV + vec2(0.0, o.y)) +
      texture2D(tex, baseUV - vec2(0.0, o.y)) +
      mid
    ) * 0.2;
  }
  vec4 c = vec4(r, soft.g, b, soft.a);
  // Cool glass tint — subtle so UI copy stays legible.
  c.rgb = mix(c.rgb, c.rgb * tint, 0.35);
  return c;
}
`;

export function glassCallGlsl(resolved: ResolvedGlass): string {
  const t = resolved.tint;
  return `c = figmentGlass(u_tex, uv, ${resolved.ior.toFixed(4)}, ${resolved.refraction.toFixed(4)}, ${resolved.dispersion.toFixed(4)}, ${resolved.frost.toFixed(4)}, vec3(${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)}));`;
}

const glassByLayer = new Map<string, ResolvedGlass>();

export function setGlass(layerId: string, desc: GlassDesc): ResolvedGlass {
  if (!layerId) {
    throw new FigmentUnsupportedError("probe-failed", "setGlass: layerId required");
  }
  const resolved = resolveGlass(desc);
  glassByLayer.set(layerId, resolved);
  return resolved;
}

export function getGlass(layerId: string): ResolvedGlass | undefined {
  return glassByLayer.get(layerId);
}

export function clearGlassMaterials(): void {
  glassByLayer.clear();
}
