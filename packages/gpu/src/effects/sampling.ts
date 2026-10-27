/**
 * M3b — bounded sampling ops for ripple / chromatic / dissolve.
 * Each op is pure GLSL; composite chains up to MAX_EFFECT_OPS.
 */

/** GLSL library injected once into the composite fragment shader. */
export const EFFECT_GLSL_LIB = `
// --- figment effects (M3b) ---

// Value noise (stable, cheap).
float figmentHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float figmentNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = figmentHash(i);
  float b = figmentHash(i + vec2(1.0, 0.0));
  float c = figmentHash(i + vec2(0.0, 1.0));
  float d = figmentHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Radial ripple: displaces UV along the wave. amp=0 is identity.
vec2 figmentRippleUV(vec2 uv, float amp, float edge) {
  vec2 c = uv - vec2(0.5);
  float d = length(c) + 1e-5;
  float ring = sin(d * 28.0) * amp;
  float falloff = smoothstep(max(edge, 0.0), 0.0, d);
  return uv + (c / d) * ring * falloff * 0.08;
}

// Chromatic aberration: split RGB along an axis.
vec4 figmentChromaticSample(sampler2D tex, vec2 uv, float off) {
  float r = texture2D(tex, uv + vec2(off, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(off, 0.0)).b;
  float a = texture2D(tex, uv).a;
  return vec4(r, g, b, a);
}

// Dissolve: noise threshold eats alpha as progress goes 0 → 1.
vec4 figmentDissolveSample(sampler2D tex, vec2 uv, float progress) {
  vec4 c = texture2D(tex, uv);
  float n = figmentNoise(uv * 72.0);
  float cut = smoothstep(progress - 0.08, progress + 0.08, n);
  return vec4(c.rgb, c.a * cut);
}
`;

/**
 * GLSL that warps working UV `uv` (ripple) before sampling.
 */
export function effectUvGlsl(
  e:
    | { kind: "ripple"; amplitude: number; edge?: number }
    | { kind: "chromatic"; offset: number }
    | { kind: "dissolve"; progress: number }
    | { kind: "custom"; id: string; params: Record<string, number> },
): string {
  if (e.kind === "ripple") {
    const edge = e.edge ?? 1;
    return `uv = figmentRippleUV(uv, ${e.amplitude.toFixed(4)}, ${edge.toFixed(4)});`;
  }
  return "";
}

/**
 * GLSL that samples into `c` given current `uv`.
 * Ripple re-samples after its UV warp; chromatic/dissolve sample directly.
 */
export function effectColorGlsl(
  e:
    | { kind: "ripple"; amplitude: number; edge?: number }
    | { kind: "chromatic"; offset: number }
    | { kind: "dissolve"; progress: number }
    | { kind: "custom"; id: string; params: Record<string, number> },
): string {
  switch (e.kind) {
    case "ripple":
    case "chromatic":
      return e.kind === "chromatic"
        ? `c = figmentChromaticSample(u_tex, uv, ${e.offset.toFixed(4)}) * u_alpha;`
        : `c = texture2D(u_tex, uv) * u_alpha;`;
    case "dissolve":
      return `c = figmentDissolveSample(u_tex, uv, ${e.progress.toFixed(4)}) * u_alpha;`;
    case "custom":
      return `/* custom ${e.id} */`;
    default:
      return "";
  }
}
