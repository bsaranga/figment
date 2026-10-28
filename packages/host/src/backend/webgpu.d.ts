/**
 * M2h — WebGPU backend.
 * `queue.drawElementImageToTexture` (Chrome 155+ dict API) into a per-layer
 * texture, then a textured-quad pass. Geometry is manual (updateElementGeometry).
 */
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
import type { LayerRecord } from "../layers.js";
export interface WebGPUBackend {
    readonly kind: "webgpu";
    draw(layers: LayerRecord[], scene: {
        cssSize: Vec2;
        unitScale: Vec2;
        camera: Camera;
    }): number;
    dispose(): void;
}
export declare function createWebGPUBackend(canvas: HTMLCanvasElement): Promise<WebGPUBackend>;
//# sourceMappingURL=webgpu.d.ts.map