import type { LayerRecord } from "../layers.js";
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
export interface Draw2DOptions {
    ctx: CanvasRenderingContext2D;
    layers: LayerRecord[];
    cssSize: Vec2;
    unitScale: Vec2;
    camera: Camera;
    /** When true, skip layers that are not dirty (caller must clear damaged regions). */
    onlyDirty: boolean;
}
/**
 * 2D backend: drawElementImage with CSS→canvas-grid scaling.
 * Geometry: 2D auto-syncs hits when preserveElementGeometry is false (default).
 */
export declare function drawLayers2D(opts: Draw2DOptions): number;
//# sourceMappingURL=2d.d.ts.map