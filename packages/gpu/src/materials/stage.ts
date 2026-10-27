/**
 * M3e — stage material (decorative ground).
 * Interaction contract: **decorative** — may move pixels; content must be
 * inert / aria-hidden. Not for live form controls (use relief for that).
 */
import { FigmentUnsupportedError } from "@figment/host";

export interface StageDesc {
  kind: "stage";
  /** Ground tint hex. Default `#12161f`. */
  tint?: string;
  /** Vignette strength 0..1. Default 0.45. */
  vignette?: number;
  /** Fine grain amount 0..1. Default 0.08. */
  grain?: number;
}

export interface ResolvedStage {
  kind: "stage";
  tint: { r: number; g: number; b: number };
  vignette: number;
  grain: number;
}

export function resolveStage(desc: StageDesc): ResolvedStage {
  const tint = parseHex(desc.tint ?? "#12161f");
  return {
    kind: "stage",
    tint,
    vignette: clamp(desc.vignette ?? 0.45, 0, 1),
    grain: clamp(desc.grain ?? 0.08, 0, 1),
  };
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
      `stage.tint must be a hex color, got ${hex}`,
    );
  }
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

/** GLSL lib: decorative ground — tint + vignette + grain. */
export const STAGE_GLSL = `
// M3e stage: decorative ground plane (vignette + tint + fine grain).
float stageHash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

vec4 figmentStage(vec4 c, vec2 uv, vec3 tint, float vignette, float grain) {
  // Ground: blend toward tint by a soft radial falloff (reads as a stage floor).
  vec2 p = uv - vec2(0.5);
  float r = length(p) * 1.4142;
  float vign = 1.0 - vignette * smoothstep(0.35, 1.0, r);
  vec3 ground = mix(c.rgb, tint, 0.55 * vign);
  float n = stageHash(uv * 256.0) - 0.5;
  ground += n * grain * 0.12;
  return vec4(ground * vign, c.a);
}
`;

export function stageCallGlsl(resolved: ResolvedStage): string {
  const t = resolved.tint;
  return `c = figmentStage(c, uv, vec3(${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)}), ${resolved.vignette.toFixed(4)}, ${resolved.grain.toFixed(4)});`;
}

export interface StageMaterialState {
  stage?: ResolvedStage;
}

const stageByLayer = new Map<string, ResolvedStage>();

export function setStage(layerId: string, desc: StageDesc): ResolvedStage {
  if (!layerId) {
    throw new FigmentUnsupportedError("probe-failed", "setStage: layerId required");
  }
  const resolved = resolveStage(desc);
  stageByLayer.set(layerId, resolved);
  return resolved;
}

export function getStage(layerId: string): ResolvedStage | undefined {
  return stageByLayer.get(layerId);
}

export function clearStageMaterials(): void {
  stageByLayer.clear();
}
