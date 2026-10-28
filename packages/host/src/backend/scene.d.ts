/**
 * M2h — shared scene packets so 2D / WebGL / WebGPU draw the same layout.
 */
import type { LayerRecord } from "../layers.js";
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
export interface LayerPacket {
    id: string;
    element: Element;
    /** Dest top-left in canvas-grid px. */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Depth scale about the vanishing point. */
    zs: number;
    rotationDeg: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
    /** Pivot in canvas-grid px (absolute). */
    pivotX: number;
    pivotY: number;
    /** Vanishing origin in canvas-grid px. */
    originX: number;
    originY: number;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface SceneContext {
    layers: LayerRecord[];
    cssSize: Vec2;
    unitScale: Vec2;
    camera: Camera;
    onlyDirty: boolean;
}
export declare function buildLayerPackets(scene: SceneContext): LayerPacket[];
//# sourceMappingURL=scene.d.ts.map