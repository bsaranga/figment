/**
 * M2h — WebGL backend.
 * Pre-allocates textures (texImage2D null) then `texElementSubImage2D`
 * (Chrome 155+ dict/cleanup args). Geometry stays manual via
 * `updateElementGeometry` (host.syncLayerGeometry).
 */
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
import type { LayerRecord } from "../layers.js";
import { buildLayerPackets, type LayerPacket } from "./scene.js";
import { FigmentUnsupportedError } from "../errors.js";

type TexElementSubImage2D = (
  target: number,
  level: number,
  xoffset: number,
  yoffset: number,
  element: Element,
  options?: { premultiplyAlpha?: string; colorSpaceConversion?: string },
) => void;

interface LayerTex {
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface WebGLBackend {
  readonly kind: "webgl";
  draw(layers: LayerRecord[], scene: { cssSize: Vec2; unitScale: Vec2; camera: Camera }): number;
  dispose(): void;
}

const VS = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform mat3 u_matrix;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
  vec3 clip = u_matrix * vec3(a_pos, 1.0);
  vec2 zeroToOne = clip.xy / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_uv = a_uv;
}`;

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  gl_FragColor = vec4(c.rgb * u_alpha, c.a * u_alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new FigmentUnsupportedError("missing-api", "WebGL createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "compile error";
    gl.deleteShader(sh);
    throw new FigmentUnsupportedError("missing-api", `WebGL shader: ${log}`);
  }
  return sh;
}

function matrix3ForPacket(p: LayerPacket, resX: number, resY: number): number[] {
  // Model: T(origin) · S(zs) · T(-origin) · T(pivot) · R · S(sx,sy) · T(-pivot) · T(x,y)
  const cos = Math.cos((p.rotationDeg * Math.PI) / 180);
  const sin = Math.sin((p.rotationDeg * Math.PI) / 180);
  const sx = p.scaleX;
  const sy = p.scaleY;

  // 2D affine in column-major mat3 (WebGL): [a,b,0, c,d,0, e,f,1]
  // Start from T(x,y) then pivot rotate/scale then depth about origin.
  let a = cos * sx;
  let b = sin * sx;
  let c = -sin * sy;
  let d = cos * sy;
  // pivot compensation: M * p = T(pivot) * R * S * T(-pivot) * (p)
  let e = p.pivotX - (a * p.pivotX + c * p.pivotY) + p.x;
  let f = p.pivotY - (b * p.pivotX + d * p.pivotY) + p.y;

  // depth scale about origin: T(o) S(zs) T(-o)
  const zs = p.zs;
  const oa = zs;
  const od = zs;
  const oe = p.originX * (1 - zs);
  const of = p.originY * (1 - zs);

  // full = depth * pivot  (2D affine multiply)
  const fa = oa * a;
  const fb = oa * b;
  const fc = od * c;
  const fd = od * d;
  const fe = oa * e + oe;
  const ff = od * f + of;

  return [fa, fb, 0, fc, fd, 0, fe, ff, 1];
}

export function createWebGLBackend(canvas: HTMLCanvasElement): WebGLBackend {
  const glMaybe = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  if (!glMaybe) {
    throw new FigmentUnsupportedError("missing-api", "WebGL context unavailable");
  }
  const gl: WebGLRenderingContext = glMaybe;

  const texFn = (gl as WebGLRenderingContext & {
    texElementSubImage2D?: TexElementSubImage2D;
  }).texElementSubImage2D;
  if (typeof texFn !== "function") {
    throw new FigmentUnsupportedError(
      "missing-api",
      "WebGL texElementSubImage2D missing (Chrome 155+ HTML-in-Canvas)",
    );
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  const program = gl.createProgram();
  if (!program) throw new FigmentUnsupportedError("missing-api", "WebGL createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new FigmentUnsupportedError(
      "missing-api",
      `WebGL link: ${gl.getProgramInfoLog(program) ?? "failed"}`,
    );
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // pos.xy + uv.xy per vertex (quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(16), gl.DYNAMIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_pos");
  const aUv = gl.getAttribLocation(program, "a_uv");
  const uMatrix = gl.getUniformLocation(program, "u_matrix");
  const uRes = gl.getUniformLocation(program, "u_resolution");
  const uTex = gl.getUniformLocation(program, "u_tex");
  const uAlpha = gl.getUniformLocation(program, "u_alpha");

  const textures = new Map<string, LayerTex>();

  function ensureTexture(packet: LayerPacket): LayerTex {
    const w = Math.max(1, Math.ceil(packet.element.getBoundingClientRect().width));
    const h = Math.max(1, Math.ceil(packet.element.getBoundingClientRect().height));
    let rec = textures.get(packet.id);
    if (!rec || rec.width !== w || rec.height !== h) {
      if (rec) gl.deleteTexture(rec.texture);
      const texture = gl.createTexture();
      if (!texture) throw new FigmentUnsupportedError("missing-api", "WebGL createTexture failed");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // Pre-allocate storage (required before texElementSubImage2D on 155+).
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      rec = { texture, width: w, height: h };
      textures.set(packet.id, rec);
    }
    return rec;
  }

  return {
    kind: "webgl",
    draw(layers, scene) {
      const dpr = window.devicePixelRatio || 1;
      const cssW = scene.cssSize.x;
      const cssH = scene.cssSize.y;
      const resX = cssW * scene.unitScale.x * dpr;
      const resY = cssH * scene.unitScale.y * dpr;
      canvas.width = Math.max(1, Math.round(resX));
      canvas.height = Math.max(1, Math.round(resY));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const packets = buildLayerPackets({
        ...scene,
        layers,
        onlyDirty: false,
      });

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(uRes, canvas.width, canvas.height);

      for (const p of packets) {
        const texRec = ensureTexture(p);
        gl.bindTexture(gl.TEXTURE_2D, texRec.texture);
        // Upload live element (must stay a bound method call).
        (gl as WebGLRenderingContext & { texElementSubImage2D: TexElementSubImage2D })
          .texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, p.element);

        const x0 = p.x;
        const y0 = p.y;
        const x1 = p.x + p.width;
        const y1 = p.y + p.height;
        const verts = new Float32Array([
          x0, y0, 0, 0,
          x1, y0, 1, 0,
          x0, y1, 0, 1,
          x0, y1, 0, 1,
          x1, y0, 1, 0,
          x1, y1, 1, 1,
        ]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
        gl.uniformMatrix3fv(uMatrix, false, matrix3ForPacket(p, canvas.width, canvas.height));
        gl.uniform1f(uAlpha, p.opacity);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uTex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      return packets.length;
    },
    dispose() {
      for (const t of textures.values()) gl.deleteTexture(t.texture);
      textures.clear();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
