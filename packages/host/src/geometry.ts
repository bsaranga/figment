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

export const IDENTITY_AFFINE: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  /** Degrees, clockwise. */
  rotation: number;
  opacity: number;
}

export const IDENTITY_TRANSFORM: LayerTransform = {
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
export function composeAffine(
  t: LayerTransform,
  origin: Vec2 = { x: 0, y: 0 },
): Affine {
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

export function applyAffine(m: Affine, p: Vec2): Vec2 {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

export function multiplyAffine(m1: Affine, m2: Affine): Affine {
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
export function determinant(m: Affine): number {
  return m.a * m.d - m.b * m.c;
}

export function isInvertible(m: Affine, epsilon = 1e-8): boolean {
  return Math.abs(determinant(m)) >= epsilon;
}

export function invertAffine(m: Affine): Affine | null {
  const det = determinant(m);
  if (Math.abs(det) < 1e-8) return null;
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
export function computeUnitScale(
  canvasGrid: { width: number; height: number },
  cssSize: { width: number; height: number },
): Vec2 {
  return {
    x: cssSize.width === 0 ? 1 : canvasGrid.width / cssSize.width,
    y: cssSize.height === 0 ? 1 : canvasGrid.height / cssSize.height,
  };
}

export function cssToCanvas(value: number, scale: number): number {
  return value * scale;
}

export function canvasToCss(value: number, scale: number): number {
  return scale === 0 ? value : value / scale;
}
