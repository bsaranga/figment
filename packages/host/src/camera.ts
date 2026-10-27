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
  origin?: { x: number; y: number };
}

export const DEFAULT_PERSPECTIVE = 1200;

export function defaultCamera(): Camera {
  return {
    z: 0,
    perspective: DEFAULT_PERSPECTIVE,
    /** Minimum distance from camera (px). */
    near: 1,
    /** Maximum distance from camera (px). */
    far: DEFAULT_PERSPECTIVE * 4,
  };
}

export function resolveNear(cam: Camera): number {
  return cam.near ?? 1;
}

export function resolveFar(cam: Camera): number {
  return cam.far ?? cam.perspective * 4;
}

/** Distance from camera along the view axis. Positive in front of the camera. */
export function viewDistance(viewZ: number, perspective: number): number {
  return perspective - viewZ;
}

/**
 * View-space Z of a layer at scene `z` under camera `cam.z`.
 * Positive = toward the viewer (nearer than the z=0 plane).
 */
export function viewZ(layerZ: number, cam: Camera): number {
  return layerZ - cam.z;
}

/**
 * Perspective scale factor for a point at viewZ.
 * CSS: `translateZ(viewZ)` under `perspective(P)` scales by `P / (P - viewZ)`.
 * Returns null when the point is at/behind the camera (viewZ >= perspective).
 */
export function depthScale(viewZ: number, perspective: number): number | null {
  const denom = perspective - viewZ;
  if (denom <= 0) return null;
  return perspective / denom;
}

export type ClipReason = "front" | "near" | "far" | "behind-camera";

export function clipReason(viewZ: number, cam: Camera): ClipReason {
  const distance = viewDistance(viewZ, cam.perspective);
  if (distance <= 0) return "behind-camera";
  if (distance < resolveNear(cam)) return "near";
  if (distance > resolveFar(cam)) return "far";
  return "front";
}

export function isVisible(viewZ: number, cam: Camera): boolean {
  return clipReason(viewZ, cam) === "front";
}

/**
 * Project a scene-space point to canvas CSS px about the vanishing origin.
 * `origin` defaults to (0,0) so hosts can pass the canvas center explicitly.
 */
export function projectPoint(
  p: { x: number; y: number },
  viewZ: number,
  cam: Camera,
  origin: { x: number; y: number } = { x: 0, y: 0 },
): { x: number; y: number; scale: number } | null {
  const s = depthScale(viewZ, cam.perspective);
  if (s === null) return null;
  return {
    x: origin.x + (p.x - origin.x) * s,
    y: origin.y + (p.y - origin.y) * s,
    scale: s,
  };
}

/**
 * CSS transform fragment for a layer under the scene camera (M2e/M2f compatible).
 * Combines translate(x,y,z), rotate, scale — parent supplies `perspective`.
 */
export function layerCssTransform3D(opts: {
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
}): string {
  const P = opts.perspective ?? 1200;
  const camZ = opts.cameraZ ?? 0;
  const vz = opts.z - camZ;
  const zs = depthScale(vz, P) ?? 1;

  const sx = (opts.scaleX ?? 1) * zs;
  const sy = (opts.scaleY ?? 1) * zs;
  const rz = opts.rotation ?? 0;
  const rx = opts.rotateX ?? 0;
  const ry = opts.rotateY ?? 0;

  // Explicit depth scale (not perspective()+translateZ) so getBoundingClientRect
  // and hit-testing match the GPU draw projection.
  const parts: string[] = [];
  if (rz !== 0) parts.push(`rotate(${rz}deg)`);
  if (rx !== 0) parts.push(`rotateX(${rx}deg)`);
  if (ry !== 0) parts.push(`rotateY(${ry}deg)`);
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
  if (opts.x !== 0 || opts.y !== 0 || opts.z !== 0) {
    parts.push(`translate(${opts.x}px, ${opts.y}px)`);
  }
  return parts.length ? parts.join(" ") : "none";
}
