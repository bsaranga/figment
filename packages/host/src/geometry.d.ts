/**
 * Pure geometry math for surface layers (affine + projective).
 * Lives in host but kept dependency-free for unit tests.
 * See PLAN.md M1i / M2f.
 */
export interface Vec2 {
    x: number;
    y: number;
}
export interface Affine {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
export declare const IDENTITY_AFFINE: Affine;
export interface LayerTransform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    /** Degrees, clockwise. */
    rotation: number;
    opacity: number;
}
export declare const IDENTITY_TRANSFORM: LayerTransform;
/**
 * Compose translate · rotate · scale about a pivot (default top-left).
 * Matches CSS `transform: translate() rotate() scale()` with `transform-origin: 0 0`.
 */
export declare function composeAffine(t: LayerTransform, origin?: Vec2): Affine;
export declare function applyAffine(m: Affine, p: Vec2): Vec2;
export declare function multiplyAffine(m1: Affine, m2: Affine): Affine;
/** Determinant of the 2×2 linear part. Near-zero ⇒ non-invertible. */
export declare function determinant(m: Affine): number;
export declare function isInvertible(m: Affine, epsilon?: number): boolean;
export declare function invertAffine(m: Affine): Affine | null;
/**
 * CSS ↔ canvas grid scale factors.
 * `scaleX = canvas.width / cssContentWidth` (see ACTIVATION.md unit footguns).
 */
export declare function computeUnitScale(canvasGrid: {
    width: number;
    height: number;
} | Vec2, cssSize: {
    width: number;
    height: number;
} | Vec2): Vec2;
export declare function cssToCanvas(value: number, scale: number): number;
export declare function canvasToCss(value: number, scale: number): number;
//# sourceMappingURL=geometry.d.ts.map