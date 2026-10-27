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

const DEG2RAD = Math.PI / 180;
export const DEFAULT_PERSPECTIVE = 1200;
export const MAX_TILT_DEG = 60;

export function clampTiltDeg(deg: number): number {
  return Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, deg));
}

function identity4(): Matrix4 {
  return {
    m11: 1, m12: 0, m13: 0, m14: 0,
    m21: 0, m22: 1, m23: 0, m24: 0,
    m31: 0, m32: 0, m33: 1, m34: 0,
    m41: 0, m42: 0, m43: 0, m44: 1,
  };
}

/** row × col for CSS matrix3d column-major storage. */
function mul4(a: Matrix4, b: Matrix4): Matrix4 {
  const at: number[][] = [
    [a.m11, a.m21, a.m31, a.m41],
    [a.m12, a.m22, a.m32, a.m42],
    [a.m13, a.m23, a.m33, a.m43],
    [a.m14, a.m24, a.m34, a.m44],
  ];
  const bt: number[][] = [
    [b.m11, b.m21, b.m31, b.m41],
    [b.m12, b.m22, b.m32, b.m42],
    [b.m13, b.m23, b.m33, b.m43],
    [b.m14, b.m24, b.m34, b.m44],
  ];
  const out: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += (at[i] as number[])[k]! * (bt[k] as number[])[j]!;
      }
      (out[i] as number[])[j] = s;
    }
  }
  return {
    m11: out[0]![0]!, m12: out[1]![0]!, m13: out[2]![0]!, m14: out[3]![0]!,
    m21: out[0]![1]!, m22: out[1]![1]!, m23: out[2]![1]!, m24: out[3]![1]!,
    m31: out[0]![2]!, m32: out[1]![2]!, m33: out[2]![2]!, m34: out[3]![2]!,
    m41: out[0]![3]!, m42: out[1]![3]!, m43: out[2]![3]!, m44: out[3]![3]!,
  };
}

function translate4(x: number, y: number): Matrix4 {
  const m = identity4();
  return { ...m, m41: x, m42: y };
}

function perspective4(p: number): Matrix4 {
  const m = identity4();
  return { ...m, m34: -1 / p };
}

function rotateXThenY(ax: number, ay: number): Matrix4 {
  const rx = ax * DEG2RAD;
  const ry = ay * DEG2RAD;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);

  // R = Rx · Ry (CSS `rotateX() rotateY()` applies Y then X in local space)
  const r11 = cy;
  const r12 = 0;
  const r13 = sy;
  const r21 = sx * sy;
  const r22 = cx;
  const r23 = -sx * cy;
  const r31 = -cx * sy;
  const r32 = sx;
  const r33 = cx * cy;

  // CSS matrix3d columns
  return {
    m11: r11, m12: r21, m13: r31, m14: 0,
    m21: r12, m22: r22, m23: r32, m24: 0,
    m31: r13, m32: r23, m33: r33, m34: 0,
    m41: 0, m42: 0, m43: 0, m44: 1,
  };
}

/**
 * CSS-compatible projective matrix for a panel of `width`×`height`
 * tilted about `origin` (fraction of the box, default center).
 * Order: `perspective(P) rotateX(ax) rotateY(ay)`.
 */
export function composeTiltMatrix(opts: {
  tilt: Tilt;
  width: number;
  height: number;
  originX?: number;
  originY?: number;
}): ProjectiveMatrix {
  const perspective =
    opts.tilt.perspective && opts.tilt.perspective > 0
      ? opts.tilt.perspective
      : DEFAULT_PERSPECTIVE;
  const ax = clampTiltDeg(opts.tilt.x);
  const ay = clampTiltDeg(opts.tilt.y);
  const ox = (opts.originX ?? 0.5) * opts.width;
  const oy = (opts.originY ?? 0.5) * opts.height;

  const matrix = mul4(
    translate4(ox, oy),
    mul4(perspective4(perspective), mul4(rotateXThenY(ax, ay), translate4(-ox, -oy))),
  );

  return { matrix, perspective, tiltX: ax, tiltY: ay };
}

/** CSS shorthand (DOM hits + layout). */
export function tiltToCss(tilt: Tilt, originX = 0.5, originY = 0.5): string {
  const perspective =
    tilt.perspective && tilt.perspective > 0
      ? tilt.perspective
      : DEFAULT_PERSPECTIVE;
  const ax = clampTiltDeg(tilt.x);
  const ay = clampTiltDeg(tilt.y);
  const ox = `${(originX * 100).toFixed(4)}%`;
  const oy = `${(originY * 100).toFixed(4)}%`;
  return `perspective(${perspective}px) rotateX(${ax}deg) rotateY(${ay}deg)`;
}

/** Convert to DOMMatrix when the platform provides it (browser). */
export function toDOMMatrix(m: Matrix4): DOMMatrix {
  return new DOMMatrix([
    m.m11, m.m12, m.m13, m.m14,
    m.m21, m.m22, m.m23, m.m24,
    m.m31, m.m32, m.m33, m.m34,
    m.m41, m.m42, m.m43, m.m44,
  ]);
}

/**
 * Transform local box corners; report which sit in front of the viewer (w > 0).
 */
export function cornersInFront(
  pm: ProjectiveMatrix,
  width: number,
  height: number,
): { corner: string; x: number; y: number; w: number; front: boolean }[] {
  const pts: { name: string; x: number; y: number }[] = [
    { name: "tl", x: 0, y: 0 },
    { name: "tr", x: width, y: 0 },
    { name: "br", x: width, y: height },
    { name: "bl", x: 0, y: height },
  ];
  const m = pm.matrix;
  return pts.map((p) => {
    const x = m.m11 * p.x + m.m21 * p.y + m.m41;
    const y = m.m12 * p.x + m.m22 * p.y + m.m42;
    const w = m.m14 * p.x + m.m24 * p.y + m.m44;
    return {
      corner: p.name,
      x: w === 0 ? x : x / w,
      y: w === 0 ? y : y / w,
      w,
      front: w > 0,
    };
  });
}

/** True when every corner is in front of the viewer (safe to hit-test). */
export function tiltFacingViewer(
  pm: ProjectiveMatrix,
  width: number,
  height: number,
): boolean {
  return cornersInFront(pm, width, height).every((c) => c.front);
}
