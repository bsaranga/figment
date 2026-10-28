/**
 * Pure geometry math for surface layers (affine + projective).
 * Lives in host but kept dependency-free for unit tests.
 * See PLAN.md M1i / M2f.
 */
export const IDENTITY_AFFINE = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
export const IDENTITY_TRANSFORM = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
};
const DEG2RAD = Math.PI / 180;
/**
 * Compose translate · rotate · scale about a pivot (default top-left).
 * Matches CSS `transform: translate() rotate() scale()` with `transform-origin: 0 0`.
 */
export function composeAffine(t, origin = { x: 0, y: 0 }) {
    const rad = t.rotation * DEG2RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // T(origin) · T(x,y) · R · S · T(-origin)
    const a = cos * t.scaleX;
    const b = sin * t.scaleX;
    const c = -sin * t.scaleY;
    const d = cos * t.scaleY;
    // pivot compensation: M * (p) should equal T(x,y)*R*S applied to (p - origin)
    const e = t.x + origin.x - (a * origin.x + c * origin.y);
    const f = t.y + origin.y - (b * origin.x + d * origin.y);
    return { a, b, c, d, e, f };
}
export function applyAffine(m, p) {
    return {
        x: m.a * p.x + m.c * p.y + m.e,
        y: m.b * p.x + m.d * p.y + m.f,
    };
}
export function multiplyAffine(m1, m2) {
    return {
        a: m1.a * m2.a + m1.c * m2.b,
        b: m1.b * m2.a + m1.d * m2.b,
        c: m1.a * m2.c + m1.c * m2.d,
        d: m1.b * m2.c + m1.d * m2.d,
        e: m1.a * m2.e + m1.c * m2.f + m1.e,
        f: m1.b * m2.e + m1.d * m2.f + m1.f,
    };
}
/** Determinant of the 2×2 linear part. Near-zero ⇒ non-invertible. */
export function determinant(m) {
    return m.a * m.d - m.b * m.c;
}
export function isInvertible(m, epsilon = 1e-8) {
    return Math.abs(determinant(m)) >= epsilon;
}
export function invertAffine(m) {
    const det = determinant(m);
    if (Math.abs(det) < 1e-8)
        return null;
    const invDet = 1 / det;
    return {
        a: m.d * invDet,
        b: -m.b * invDet,
        c: -m.c * invDet,
        d: m.a * invDet,
        e: (m.c * m.f - m.d * m.e) * invDet,
        f: (m.b * m.e - m.a * m.f) * invDet,
    };
}
/**
 * CSS ↔ canvas grid scale factors.
 * `scaleX = canvas.width / cssContentWidth` (see ACTIVATION.md unit footguns).
 */
export function computeUnitScale(canvasGrid, cssSize) {
    const gridW = "width" in canvasGrid ? canvasGrid.width : canvasGrid.x;
    const gridH = "height" in canvasGrid ? canvasGrid.height : canvasGrid.y;
    const cssW = "width" in cssSize ? cssSize.width : cssSize.x;
    const cssH = "height" in cssSize ? cssSize.height : cssSize.y;
    return {
        x: cssW === 0 ? 1 : gridW / cssW,
        y: cssH === 0 ? 1 : gridH / cssH,
    };
}
export function cssToCanvas(value, scale) {
    return value * scale;
}
export function canvasToCss(value, scale) {
    return scale === 0 ? value : value / scale;
}
//# sourceMappingURL=geometry.js.map