/**
 * M2f — projective tilt (tiltX / tiltY / perspective).
 * Pure 4×4 math (CSS matrix3d order) so unit tests run without DOMMatrix.
 * See ARCHITECTURE.md tilt.ts and ACTIVATION.md (tilt hit-test footguns).
 */
import type { Tilt } from "./types.js";
export interface Matrix4 {
    /** CSS matrix3d, column-major: m11 m12 m13 m14 m21 ... m44. */
    readonly m11: number;
    readonly m12: number;
    readonly m13: number;
    readonly m14: number;
    readonly m21: number;
    readonly m22: number;
    readonly m23: number;
    readonly m24: number;
    readonly m31: number;
    readonly m32: number;
    readonly m33: number;
    readonly m34: number;
    readonly m41: number;
    readonly m42: number;
    readonly m43: number;
    readonly m44: number;
}
export interface ProjectiveMatrix {
    readonly matrix: Matrix4;
    readonly perspective: number;
    readonly tiltX: number;
    readonly tiltY: number;
}
export declare const DEFAULT_PERSPECTIVE = 1200;
export declare const MAX_TILT_DEG = 60;
export declare function clampTiltDeg(deg: number): number;
/**
 * CSS-compatible projective matrix for a panel of `width`×`height`
 * tilted about `origin` (fraction of the box, default center).
 * Order: `perspective(P) rotateX(ax) rotateY(ay)`.
 */
export declare function composeTiltMatrix(opts: {
    tilt: Tilt;
    width: number;
    height: number;
    originX?: number;
    originY?: number;
}): ProjectiveMatrix;
/** CSS shorthand (DOM hits + layout). */
export declare function tiltToCss(tilt: Tilt, originX?: number, originY?: number): string;
/** Convert to DOMMatrix when the platform provides it (browser). */
export declare function toDOMMatrix(m: Matrix4): DOMMatrix;
/**
 * Transform local box corners; report which sit in front of the viewer (w > 0).
 */
export declare function cornersInFront(pm: ProjectiveMatrix, width: number, height: number): {
    corner: string;
    x: number;
    y: number;
    w: number;
    front: boolean;
}[];
/** True when every corner is in front of the viewer (safe to hit-test). */
export declare function tiltFacingViewer(pm: ProjectiveMatrix, width: number, height: number): boolean;
export interface TiltWitnessSample {
    label: string;
    client: {
        x: number;
        y: number;
    };
    matched: boolean;
    actualId: string | null;
}
export interface TiltWitnessResult {
    ok: boolean;
    samples: TiltWitnessSample[];
    detail: string;
}
/**
 * Functional witness: apply the tilt, sample transformed local points with
 * elementFromPoint, refuse when hits do not match the visual quad.
 * Synchronous — forces layout before sampling.
 */
export declare function witnessTilt(opts: {
    element: HTMLElement;
    tilt: Tilt;
    originX?: number;
    originY?: number;
    /**
     * Re-push canvas geometry after the CSS tilt is applied.
     * Required for elements inside `content="drawable"` canvases — without
     * updateElementGeometry, elementFromPoint returns the canvas, not the child.
     */
    syncHits?: () => void;
    /** Restored on the element after the probe. */
    previousTransform?: string;
    previousTransformOrigin?: string;
}): TiltWitnessResult;
//# sourceMappingURL=tilt.d.ts.map