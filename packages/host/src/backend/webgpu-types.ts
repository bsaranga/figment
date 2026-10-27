/**
 * Minimal WebGPU type shims for M2h (no @webgpu/types dependency).
 */
export interface GPUTexture {
  createView(): GPUTextureView;
  destroy(): void;
}
export interface GPUTextureView {
  readonly __brand?: "GPUTextureView";
}
export interface GPUDevice {
  createShaderModule(desc: { code: string }): unknown;
  createRenderPipeline(desc: unknown): GPURenderPipeline;
  createSampler(desc: unknown): unknown;
  createBuffer(desc: { size: number; usage: number }): GPUBuffer;
  createTexture(desc: unknown): GPUTexture;
  createBindGroup(desc: unknown): unknown;
  createCommandEncoder(): GPUCommandEncoder;
  queue: GPUQueue;
}
export interface GPURenderPipeline {
  getBindGroupLayout(index: number): unknown;
}
export interface GPUBuffer {
  destroy(): void;
}
export interface GPUQueue {
  writeBuffer(buf: GPUBuffer, offset: number, data: BufferSource): void;
  submit(buffers: unknown[]): void;
  drawElementImageToTexture?: (
    source: { source: Element; origin?: { x: number; y: number } },
    dest: {
      texture: GPUTexture;
      origin?: { x: number; y: number };
      flipY?: boolean;
    },
  ) => void;
}
export interface GPUCommandEncoder {
  beginRenderPass(desc: unknown): GPURenderPassEncoder;
  finish(): unknown;
}
export interface GPURenderPassEncoder {
  setPipeline(p: GPURenderPipeline): void;
  setVertexBuffer(slot: number, buf: GPUBuffer): void;
  setBindGroup(index: number, group: unknown): void;
  draw(vertexCount: number): void;
  end(): void;
}
export interface GPUCanvasContext {
  configure(desc: unknown): void;
  getCurrentTexture(): GPUTexture;
}
export interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): string;
}
export interface GPUAdapter {
  requestDevice(): Promise<GPUDevice>;
}

export const GPUBufferUsage = {
  VERTEX: 0x20,
  COPY_DST: 0x8,
  UNIFORM: 0x40,
} as const;
export const GPUTextureUsage = {
  TEXTURE_BINDING: 0x04,
  COPY_DST: 0x02,
  RENDER_ATTACHMENT: 0x10,
} as const;
