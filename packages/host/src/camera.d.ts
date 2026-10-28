/**
 * M2j — shared scene camera + transform.z projection.
 * Layer `z` is scene-space; camera.z flies along the view axis.
 * Screen scale ≈ perspective / (perspective - viewZ) (CSS translateZ model).
 */
export interface Camera {
    /**
     * Camera world Z (px). Increasing moves toward the viewer (positive z).
     * Flying *into* the scene (toward far content) means decreasing z.
     * `viewZ = layerZ - z` — larger viewZ = closer / larger on screen.
     */
    z: number;
    /** CSS perspective equivalent in px. */
    perspective: number;
    /** Near clip plane (viewZ must be > near). Default `perspective * 0.05`. */
    near?: number;
    /** Far clip plane (viewZ must be < far). Default `perspective * 4`. */
    far?: number;
    /** Vanishing point in canvas CSS px. Default = canvas center. */
    origin?: {
        x: number;
        y: number;
    };
}
export declare const DEFAULT_PERSPECTIVE = 1200;
export declare function defaultCamera(): Camera;
export declare function resolveNear(cam: Camera): number;
export declare function resolveFar(cam: Camera): number;
/** Distance from camera along the view axis. Positive in front of the camera. */
export declare function viewDistance(viewZ: number, perspective: number): number;
/**
 * View-space Z of a layer at scene `z` under camera `cam.z`.
 * Positive = toward the viewer (nearer than the z=0 plane).
 */
export declare function viewZ(layerZ: number, cam: Camera): number;
/**
 * Perspective scale factor for a point at viewZ.
 * CSS: `translateZ(viewZ)` under `perspective(P)` scales by `P / (P - viewZ)`.
 * Returns null when the point is at/behind the camera (viewZ >= perspective).
 */
export declare function depthScale(viewZ: number, perspective: number): number | null;
export type ClipReason = "front" | "near" | "far" | "behind-camera";
export declare function clipReason(viewZ: number, cam: Camera): ClipReason;
export declare function isVisible(viewZ: number, cam: Camera): boolean;
/**
 * Project a scene-space point to canvas CSS px about the vanishing origin.
 * `origin` defaults to (0,0) so hosts can pass the canvas center explicitly.
 */
export declare function projectPoint(p: {
    x: number;
    y: number;
}, viewZ: number, cam: Camera, origin?: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
    scale: number;
} | null;
/**
 * CSS transform fragment for a layer under the scene camera (M2e/M2f compatible).
 * Combines translate(x,y,z), rotate, scale — parent supplies `perspective`.
 */
export declare function layerCssTransform3D(opts: {
    x: number;
    y: number;
    z: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    rotateX?: number;
    rotateY?: number;
    opacity?: number;
    /** Camera perspective used to derive depth scale from z. Default 1200. */
    perspective?: number;
    /** Camera z (fly-through). Combined with layer z as viewZ. Default 0. */
    cameraZ?: number;
}): string;
//# sourceMappingURL=camera.d.ts.map