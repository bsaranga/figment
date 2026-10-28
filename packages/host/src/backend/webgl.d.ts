/**
 * M2h — WebGL backend.
 * Pre-allocates textures (texImage2D null) then `texElementSubImage2D`
 * (Chrome 155+ dict/cleanup args). Geometry stays manual via
 * `updateElementGeometry` (host.syncLayerGeometry).
 */
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
import type { LayerRecord } from "../layers.js";
export interface WebGLBackend {
    readonly kind: "webgl";
    draw(layers: LayerRecord[], scene: {
        cssSize: Vec2;
        unitScale: Vec2;
        camera: Camera;
    }): number;
    dispose(): void;
}
export declare function createWebGLBackend(canvas: HTMLCanvasElement): WebGLBackend;
//# sourceMappingURL=webgl.d.ts.map