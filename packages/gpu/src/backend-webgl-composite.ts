/**
 * M3a — WebGL composite backend: direct `texElementSubImage2D` upload
 * into pre-allocated textures, then one draw per layer. No 2D staging.
 */
import {
  validateEffectChain,
  type CompositeBackend,
  type CompositeFrameInput,
  type CompositeLayerInput,
  type EffectDesc,
} from "./composite.js";
import {
  EFFECT_GLSL_LIB,
  effectColorGlsl,
  effectUvGlsl,
} from "./effects/sampling.js";
import { getEffect, clampParam } from "./effects/schema.js";
import {
  RELIEF_GLSL,
  resolveRelief,
  reliefCallGlsl,
} from "./materials/relief.js";
import {
  STAGE_GLSL,
  resolveStage,
  stageCallGlsl,
} from "./materials/stage.js";
import { FigmentUnsupportedError } from "@figment/host";

type TexElementSubImage2D = (
  target: number,
  level: number,
  xoffset: number,
  yoffset: number,
  element: Element,
  options?: { premultiplyAlpha?: string; colorSpaceConversion?: string },
) => void;

const VS = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
  vec2 zeroToOne = a_pos / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
  v_uv = a_uv;
}`;

function fragmentSrc(
  effects: EffectDesc[],
  material?: CompositeLayerInput["material"],
): string {
  const chain = validateEffectChain(effects);
  // Stage 1: UV warps (ripple). Stage 2: resample (chromatic/dissolve/ripple).
  const uvOps = chain.map((e) => effectUvGlsl(e)).filter(Boolean).join("\n  ");
  const colorOps = chain.map((e) => effectColorGlsl(e)).filter(Boolean).join("\n  ");

  // M3c: pull compiled custom effect GLSL + bake params.
  const customFns: string[] = [];
  const customCalls: string[] = [];
  for (const e of chain) {
    if (e.kind !== "custom") continue;
    const pub = getEffect(e.id);
    if (!pub) continue;
    customFns.push(pub.glsl);
    // Bake params as literals into the call.
    const args = pub.params.map((p) => {
      const raw = e.params?.[p.name] ?? p.min;
      return clampParam(p, raw).toFixed(6);
    });
    customCalls.push(
      `c = figmentCustom_${pub.id}(c${args.length ? ", " : ""}${args.join(", ")});`,
    );
  }
  const colorOpsFull = [
    ...colorOps.split("\n").filter(Boolean),
    ...customCalls,
  ].join("\n  ");

  let materialOp = "";
  if (material && material.kind === "relief") {
    materialOp = reliefCallGlsl(resolveRelief(material));
  } else if (material && material.kind === "stage") {
    materialOp = stageCallGlsl(resolveStage(material));
  }

  return `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
${EFFECT_GLSL_LIB}
${RELIEF_GLSL}
${STAGE_GLSL}
${customFns.join("\n")}
void main() {
  vec2 uv = v_uv;
  ${uvOps}
  vec4 c = texture2D(u_tex, uv) * u_alpha;
  ${colorOpsFull}
  ${materialOp}
  gl_FragColor = c;
}`;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new FigmentUnsupportedError("missing-api", "WebGL createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "compile";
    gl.deleteShader(sh);
    throw new FigmentUnsupportedError("missing-api", `composite shader: ${log}`);
  }
  return sh;
}

interface TexRecord {
  texture: WebGLTexture;
  width: number;
  height: number;
  effectsKey: string;
  program: WebGLProgram;
}

export function createWebGLComposite(canvas: HTMLCanvasElement): CompositeBackend {
  const glMaybe = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!glMaybe) {
    throw new FigmentUnsupportedError("missing-api", "WebGL context unavailable");
  }
  const gl: WebGLRenderingContext = glMaybe;
  // texElementSubImage2D requires content="drawable" on the target canvas.
  canvas.setAttribute("content", "drawable");
  const texFn = (gl as WebGLRenderingContext & { texElementSubImage2D?: TexElementSubImage2D })
    .texElementSubImage2D;
  if (typeof texFn !== "function") {
    throw new FigmentUnsupportedError(
      "missing-api",
      "WebGL texElementSubImage2D missing (direct GPU upload path)",
    );
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const programs = new Map<string, WebGLProgram>();
  const textures = new Map<string, TexRecord>();
  const buf = gl.createBuffer();
  if (!buf) throw new FigmentUnsupportedError("missing-api", "WebGL createBuffer failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(24), gl.DYNAMIC_DRAW);

  function programFor(
    effects: EffectDesc[],
    material?: CompositeLayerInput["material"],
  ): WebGLProgram {
    const key = JSON.stringify([effects.map((e) => e.kind), material?.kind, material]);
    let prog = programs.get(key);
    if (prog) return prog;
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSrc(effects, material));
    prog = gl.createProgram();
    if (!prog) throw new FigmentUnsupportedError("missing-api", "WebGL createProgram failed");
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new FigmentUnsupportedError(
        "missing-api",
        `composite link: ${gl.getProgramInfoLog(prog) ?? "failed"}`,
      );
    }
    programs.set(key, prog);
    return prog;
  }

  return {
    kind: "webgl",
    draw(frame) {
      const { width, height, layers } = frame;
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      gl.viewport(0, 0, canvas.width, canvas.height);
      // M2i: transparent clear.
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      let drawn = 0;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i]!;
        const effects = layer.effects ?? [];
        validateEffectChain(effects);
        const material = layer.material;

        const w = Math.max(1, Math.ceil(layer.width));
        const h = Math.max(1, Math.ceil(layer.height));
        const key = `L${i}`;
        let rec = textures.get(key);
        const effectsKey = JSON.stringify([effects, material]);
        if (!rec || rec.width !== w || rec.height !== h || rec.effectsKey !== effectsKey) {
          if (rec) gl.deleteTexture(rec.texture);
          const texture = gl.createTexture();
          if (!texture) throw new FigmentUnsupportedError("missing-api", "createTexture");
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          // Pre-allocate (required by texElementSubImage2D on Chrome 155+).
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          rec = {
            texture,
            width: w,
            height: h,
            effectsKey,
            program: programFor(effects, material),
          };
          textures.set(key, rec);
        }

        // Direct upload — no 2D staging canvas.
        (gl as WebGLRenderingContext & { texElementSubImage2D: TexElementSubImage2D })
          .texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, layer.element, {
            premultiplyAlpha: "premultiply",
            colorSpaceConversion: "none",
          });

        const prog = rec.program;
        gl.useProgram(prog);
        const aPos = gl.getAttribLocation(prog, "a_pos");
        const aUv = gl.getAttribLocation(prog, "a_uv");
        const uRes = gl.getUniformLocation(prog, "u_resolution");
        const uTex = gl.getUniformLocation(prog, "u_tex");
        const uAlpha = gl.getUniformLocation(prog, "u_alpha");

        const x0 = layer.x;
        const y0 = layer.y;
        const x1 = layer.x + layer.width;
        const y1 = layer.y + layer.height;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferSubData(
          gl.ARRAY_BUFFER,
          0,
          new Float32Array([
            x0, y0, 0, 0,
            x1, y0, 1, 0,
            x0, y1, 0, 1,
            x0, y1, 0, 1,
            x1, y0, 1, 0,
            x1, y1, 1, 1,
          ]),
        );
        gl.enableVertexAttribArray(aPos);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uAlpha, layer.opacity ?? 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rec.texture);
        gl.uniform1i(uTex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        drawn++;
      }
      return drawn;
    },
    dispose() {
      for (const t of textures.values()) gl.deleteTexture(t.texture);
      textures.clear();
      for (const p of programs.values()) gl.deleteProgram(p);
      programs.clear();
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
    },
  };
}

/** Alias used by tests — the M3a direct-upload path. */
export function createDirectComposite(canvas: HTMLCanvasElement): CompositeBackend {
  return createWebGLComposite(canvas);
}
