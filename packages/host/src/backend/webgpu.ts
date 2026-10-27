/**
 * M2h — WebGPU backend.
 * `queue.drawElementImageToTexture` (Chrome 155+ dict API) into a per-layer
 * texture, then a textured-quad pass. Geometry is manual (updateElementGeometry).
 */
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
import type { LayerRecord } from "../layers.js";
import { buildLayerPackets, type LayerPacket } from "./scene.js";
import { FigmentUnsupportedError } from "../errors.js";
import { WGSL_EDGE_AA } from "./aa.js";
import {
  GPUBufferUsage,
  GPUTextureUsage,
  type GPU,
  type GPUBuffer,
  type GPUCanvasContext,
  type GPUDevice,
  type GPUQueue,
  type GPURenderPipeline,
  type GPUTexture,
  type GPUTextureView,
} from "./webgpu-types.js";

export interface WebGPUBackend {
  readonly kind: "webgpu";
  draw(layers: LayerRecord[], scene: { cssSize: Vec2; unitScale: Vec2; camera: Camera }): number;
  dispose(): void;
}

const WGSL = `
struct Uniforms {
  matrix: mat4x4f,
  alpha: f32,
  _pad: vec3f,
};
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VSOut {
  var out: VSOut;
  out.pos = u.matrix * vec4f(pos, 0.0, 1.0);
  out.uv = uv;
  return out;
}

${WGSL_EDGE_AA}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let dims = vec2f(textureDimensions(tex));
  return figmentSamplePremul(tex, samp, in.uv, vec2f(1.0) / dims, u.alpha);
}
`;

type DrawElementImageToTexture = NonNullable<GPUQueue["drawElementImageToTexture"]>;

interface LayerTex {
  texture: GPUTexture;
  width: number;
  height: number;
  view: GPUTextureView;
}

function packetMatrix(p: LayerPacket, resX: number, resY: number): Float32Array {
  // Match WebGL: depth-about-origin · pivot-rotate-scale · translate.
  const cos = Math.cos((p.rotationDeg * Math.PI) / 180);
  const sin = Math.sin((p.rotationDeg * Math.PI) / 180);
  const sx = p.scaleX;
  const sy = p.scaleY;
  const a = cos * sx;
  const b = sin * sx;
  const c = -sin * sy;
  const d = cos * sy;
  const e = p.pivotX - (a * p.pivotX + c * p.pivotY) + p.x;
  const f = p.pivotY - (b * p.pivotX + d * p.pivotY) + p.y;

  const zs = p.zs;
  const fa = zs * a;
  const fb = zs * b;
  const fc = zs * c;
  const fd = zs * d;
  const fe = zs * e + p.originX * (1 - zs);
  const ff = zs * f + p.originY * (1 - zs);

  // 2D affine → clip: x' = 2x/W - 1, y' = 1 - 2y/H (y flip)
  const w = resX;
  const h = resY;
  const m00 = (2 * fa) / w;
  const m10 = (2 * fb) / w;
  const m30 = (2 * fe) / w - 1;
  const m01 = (-2 * fc) / h;
  const m11 = (-2 * fd) / h;
  const m31 = 1 - (2 * ff) / h;

  return new Float32Array([
    m00, m10, 0, 0,
    m01, m11, 0, 0,
    0, 0, 1, 0,
    m30, m31, 0, 1,
  ]);
}

export async function createWebGPUBackend(
  canvas: HTMLCanvasElement,
): Promise<WebGPUBackend> {
  const anyCanvas = canvas as HTMLCanvasElement & {
    getContext: (id: string, attrs?: unknown) => unknown;
  };
  const gpu = (globalThis as { navigator?: { gpu?: GPU } }).navigator?.gpu;
  if (!gpu) {
    throw new FigmentUnsupportedError("missing-api", "navigator.gpu unavailable");
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new FigmentUnsupportedError("missing-api", "WebGPU adapter unavailable");
  }
  const device = await adapter.requestDevice();
  const ctx = anyCanvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!ctx) {
    throw new FigmentUnsupportedError("missing-api", "GPUCanvasContext unavailable");
  }

  const format = gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "premultiplied" });

  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
      buffers: [
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x2" },
          ],
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const vertexBuffer = device.createBuffer({
    size: 6 * 16,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const uniformBuffer = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const textures = new Map<string, LayerTex>();
  const drawToTexture = (
    device.queue as GPUQueue & {
      drawElementImageToTexture?: DrawElementImageToTexture;
    }
  ).drawElementImageToTexture;
  if (typeof drawToTexture !== "function") {
    throw new FigmentUnsupportedError(
      "missing-api",
      "GPUQueue.drawElementImageToTexture missing (Chrome 155+ HTML-in-Canvas)",
    );
  }

  function ensureTexture(p: LayerPacket): LayerTex {
    const w = Math.max(1, Math.ceil(p.element.getBoundingClientRect().width));
    const h = Math.max(1, Math.ceil(p.element.getBoundingClientRect().height));
    let rec = textures.get(p.id);
    if (!rec || rec.width !== w || rec.height !== h) {
      rec?.texture.destroy();
      const texture = device.createTexture({
        size: [w, h],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      rec = { texture, width: w, height: h, view: texture.createView() };
      textures.set(p.id, rec);
    }
    return rec;
  }

  return {
    kind: "webgpu",
    draw(layers, scene) {
      const dpr = window.devicePixelRatio || 1;
      const resX = Math.max(
        1,
        Math.round(scene.cssSize.x * scene.unitScale.x * dpr),
      );
      const resY = Math.max(
        1,
        Math.round(scene.cssSize.y * scene.unitScale.y * dpr),
      );
      canvas.width = resX;
      canvas.height = resY;

      const packets = buildLayerPackets({
        ...scene,
        layers,
        onlyDirty: false,
      });

      // Upload element → texture (dict API).
      for (const p of packets) {
        const rec = ensureTexture(p);
        (device.queue as GPUQueue & { drawElementImageToTexture: DrawElementImageToTexture })
          .drawElementImageToTexture(
            { source: p.element, premultiplyAlpha: "premultiply" } as never,
            { texture: rec.texture },
          );
      }

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);

      for (const p of packets) {
        const rec = textures.get(p.id);
        if (!rec) continue;
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
        device.queue.writeBuffer(vertexBuffer, 0, verts);
        const mat = packetMatrix(p, resX, resY);
        const uniforms = new Float32Array(20);
        uniforms.set(mat, 0);
        uniforms[16] = p.opacity;
        device.queue.writeBuffer(uniformBuffer, 0, uniforms);

        const bind = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: rec.view },
            { binding: 2, resource: { buffer: uniformBuffer } },
          ],
        });
        pass.setBindGroup(0, bind);
        pass.draw(6);
      }

      pass.end();
      device.queue.submit([encoder.finish()]);
      return packets.length;
    },
    dispose() {
      for (const t of textures.values()) t.texture.destroy();
      textures.clear();
      vertexBuffer.destroy();
      uniformBuffer.destroy();
    },
  };
}
