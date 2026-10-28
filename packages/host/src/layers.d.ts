import type { LayerOpts, LayerTransform, Tilt, TransformOrigin } from "./types.js";
import type { Affine, Vec2 } from "./geometry.js";
export interface LayerRecord {
    id: string;
    element: Element;
    transform: LayerTransform;
    origin: TransformOrigin;
    clip?: DOMRect;
    tilt?: Tilt;
    decorative: boolean;
    drawAt?: {
        x: number;
        y: number;
    };
    dirty: boolean;
    /** M2d: keep hit-test order stable across redraws. */
    preserveHitTestOrder: boolean;
    /** M2d: last canvasTransform pushed to updateElementGeometry. */
    canvasTransform?: DOMMatrix;
    /** Nest canvas marks owned while this layer is active. */
    nestedMarks: {
        canvas: HTMLCanvasElement;
        previous: string | null;
    }[];
}
export declare function resolveOrigin(origin: TransformOrigin, size: Vec2): Vec2;
export declare function layerAffine(record: LayerRecord, cssSize: Vec2, unitScale: Vec2): Affine;
export declare class LayerRegistry {
    private map;
    private seq;
    readonly budget: number;
    constructor(budget?: number);
    get size(): number;
    add(element: Element, opts?: LayerOpts): LayerRecord;
    get(id: string): LayerRecord | undefined;
    findByElement(el: Element): LayerRecord | undefined;
    findForTarget(node: Node): LayerRecord | undefined;
    all(): LayerRecord[];
    /** Layers topmost-first for hit resolution. */
    hitStack(): LayerRecord[];
    dirtyAll(): LayerRecord[];
    markAllDirty(): void;
    remove(id: string): LayerRecord | undefined;
    clear(): void;
}
//# sourceMappingURL=layers.d.ts.map