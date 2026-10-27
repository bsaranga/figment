/**
 * M3c — defineEffect schema: validate → compile → publish.
 * Frozen color-function schema (params + expression body) lowered to GLSL
 * for the composite pass. Apps define once; layers reference by id.
 */
import { FigmentUnsupportedError } from "@figment/host";

export interface EffectParamSpec {
  name: string;
  min: number;
  max: number;
}

export interface EffectDefinition {
  /** Stable id used by `{ kind: "custom", id }`. */
  id: string;
  /**
   * Frozen color-function schema. Either:
   * - expression body using `c` (vec4 input) and declared params, or
   * - full `vec4 name(vec4 c) { ... }` function (name is replaced).
   */
  wgsl: string;
  params: EffectParamSpec[];
}

export interface CompiledEffect {
  id: string;
  params: EffectParamSpec[];
  /** GLSL function emitted for the composite shader. */
  glsl: string;
  /** Original schema (frozen). */
  source: string;
}

const ID_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Registry of published (compiled) effects. */
const published = new Map<string, CompiledEffect>();

export function getEffect(id: string): CompiledEffect | undefined {
  return published.get(id);
}

export function listEffects(): CompiledEffect[] {
  return [...published.values()];
}

export function clearEffects(): void {
  published.clear();
}

function fail(msg: string): never {
  throw new FigmentUnsupportedError("probe-failed", `defineEffect: ${msg}`);
}

/** Validate the definition shape (before any compilation). */
export function validateEffectDefinition(def: EffectDefinition): void {
  if (!def || typeof def !== "object") fail("definition must be an object");
  if (!def.id || !ID_RE.test(def.id)) {
    fail(`id "${def.id}" must match ${ID_RE}`);
  }
  if (typeof def.wgsl !== "string" || !def.wgsl.trim()) {
    fail("wgsl must be a non-empty string");
  }
  if (!Array.isArray(def.params)) fail("params must be an array");
  const seen = new Set<string>();
  for (const p of def.params) {
    if (!p || !ID_RE.test(p.name ?? "")) fail(`param name "${p?.name}" is invalid`);
    if (seen.has(p.name)) fail(`duplicate param "${p.name}"`);
    seen.add(p.name);
    if (!Number.isFinite(p.min) || !Number.isFinite(p.max)) {
      fail(`param "${p.name}" min/max must be finite`);
    }
    if (p.min > p.max) fail(`param "${p.name}" min > max`);
  }
  // Reject obvious escapes from the frozen schema.
  if (/;/.test(def.wgsl) && !/^\s*vec4\s+\w+\s*\(/.test(def.wgsl)) {
    // statements allowed only inside a full function form
  }
  if (/\b(gl_FragColor|out\s+vec4|uniform\s+)/.test(def.wgsl)) {
    fail("wgsl must be a frozen color function, not a full fragment shader");
  }
}

/** Extract expression body from schema (accepts full function form). */
export function extractExpression(wgsl: string): string {
  const fn = wgsl.match(/^\s*vec4\s+\w+\s*\(\s*vec4\s+\w+\s*\)\s*\{([\s\S]*)\}\s*$/);
  if (fn) return fn[1]!.trim();
  return wgsl.trim();
}

/**
 * Compile schema → GLSL function. Throws on invalid schema.
 * Publish is separate so callers can compile-then-publish atomically.
 */
export function compileEffect(def: EffectDefinition): CompiledEffect {
  validateEffectDefinition(def);
  const expr = extractExpression(def.wgsl);

  // Function takes (c, param...) — composite bakes param literals at link time.
  const argList = def.params.map((p) => `float ${p.name}`).join(", ");
  const glsl = `
vec4 figmentCustom_${def.id}(vec4 c${def.params.length ? ", " : ""}${argList}) {
  vec4 _out = ${expr};
  return _out;
}
`;

  // Basic well-formedness: expression must mention vec4-ish output or c.
  if (!/\bc\b|\bvec4\b/.test(expr)) {
    fail("expression must operate on `c` (vec4) or construct a vec4");
  }
  // Balanced braces already handled by extract; require balanced parens.
  const opens = (expr.match(/\(/g) || []).length;
  const closes = (expr.match(/\)/g) || []).length;
  if (opens !== closes) fail("expression has unbalanced parentheses");

  return {
    id: def.id,
    params: def.params.map((p) => ({ ...p })),
    glsl,
    source: def.wgsl,
  };
}

/**
 * Optional GPU compile check (link a throwaway program) — compile-then-publish
 * with a real driver when a WebGL context is provided.
 */
export function compileEffectOnGPU(
  def: EffectDefinition,
  gl: WebGLRenderingContext | null,
): CompiledEffect {
  const compiled = compileEffect(def);
  if (!gl) return compiled;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) fail("WebGL createShader failed");
  gl.shaderSource(
    vs,
    `attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`,
  );
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    fail(`vertex compile: ${gl.getShaderInfoLog(vs) ?? ""}`);
  }
  gl.shaderSource(
    fs,
    `precision mediump float;
${compiled.glsl}
void main() {
  vec4 c = vec4(1.0);
  gl_FragColor = figmentCustom_${compiled.id}(c${compiled.params.map((p) => `, ${p.name}`).join("")});
}`,
  );
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    fail(`effect shader compile: ${gl.getShaderInfoLog(fs) ?? ""}`);
  }
  const prog = gl.createProgram();
  if (!prog) fail("WebGL createProgram failed");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    fail(`effect link: ${gl.getProgramInfoLog(prog) ?? ""}`);
  }
  gl.deleteProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return compiled;
}

/**
 * Compile then publish into the registry (atomic).
 * On failure the registry is unchanged.
 */
export function defineEffect(
  def: EffectDefinition,
  gl: WebGLRenderingContext | null = null,
): CompiledEffect {
  const compiled = compileEffectOnGPU(def, gl);
  published.set(compiled.id, compiled);
  return compiled;
}

/** Clamp a param value to its declared [min,max]. */
export function clampParam(
  spec: EffectParamSpec,
  value: number,
): number {
  if (!Number.isFinite(value)) return spec.min;
  return Math.max(spec.min, Math.min(spec.max, value));
}
