import { describe, expect, it } from "vitest";
import {
  applyAffine,
  composeAffine,
  computeUnitScale,
  IDENTITY_TRANSFORM,
  invertAffine,
  isInvertible,
  multiplyAffine,
} from "../../packages/host/src/geometry.ts";

describe("composeAffine", () => {
  it("identity transform maps points to themselves", () => {
    const m = composeAffine(IDENTITY_TRANSFORM);
    expect(applyAffine(m, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
  });

  it("translates by x/y", () => {
    const m = composeAffine({ ...IDENTITY_TRANSFORM, x: 5, y: -3 });
    expect(applyAffine(m, { x: 1, y: 1 })).toEqual({ x: 6, y: -2 });
  });

  it("scales about origin", () => {
    const m = composeAffine({ ...IDENTITY_TRANSFORM, scaleX: 2, scaleY: 3 });
    expect(applyAffine(m, { x: 4, y: 5 })).toEqual({ x: 8, y: 15 });
  });

  it("rotates 90° clockwise: (1,0) → (0,1) in screen coords", () => {
    const m = composeAffine({ ...IDENTITY_TRANSFORM, rotation: 90 });
    const p = applyAffine(m, { x: 1, y: 0 });
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(1, 10);
  });

  it("rotates about a pivot", () => {
    // rotate 180° about (10, 0): (11, 0) → (9, 0)
    const m = composeAffine(
      { ...IDENTITY_TRANSFORM, rotation: 180 },
      { x: 10, y: 0 },
    );
    const p = applyAffine(m, { x: 11, y: 0 });
    expect(p.x).toBeCloseTo(9, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });
});

describe("invertAffine", () => {
  it("round-trips a point", () => {
    const m = composeAffine({
      x: 12,
      y: -4,
      scaleX: 1.5,
      scaleY: 0.5,
      rotation: 33,
      opacity: 1,
    });
    expect(isInvertible(m)).toBe(true);
    const inv = invertAffine(m);
    expect(inv).not.toBeNull();
    const p = { x: 30, y: -8 };
    const back = applyAffine(inv!, applyAffine(m, p));
    expect(back.x).toBeCloseTo(p.x, 8);
    expect(back.y).toBeCloseTo(p.y, 8);
  });

  it("returns null for singular matrices", () => {
    const m = composeAffine({ ...IDENTITY_TRANSFORM, scaleX: 0, scaleY: 1 });
    expect(isInvertible(m)).toBe(false);
    expect(invertAffine(m)).toBeNull();
  });
});

describe("multiplyAffine", () => {
  it("is associative with identity", () => {
    const m = composeAffine({ ...IDENTITY_TRANSFORM, x: 3, y: 4 });
    const id = composeAffine(IDENTITY_TRANSFORM);
    const a = applyAffine(multiplyAffine(id, m), { x: 1, y: 1 });
    const b = applyAffine(m, { x: 1, y: 1 });
    expect(a).toEqual(b);
  });
});

describe("computeUnitScale", () => {
  it("computes canvas-grid px per CSS px", () => {
    const s = computeUnitScale({ width: 600, height: 300 }, { width: 400, height: 200 });
    expect(s.x).toBeCloseTo(1.5);
    expect(s.y).toBeCloseTo(1.5);
  });

  it("guards zero CSS size", () => {
    const s = computeUnitScale({ width: 10, height: 10 }, { width: 0, height: 0 });
    expect(s.x).toBe(1);
    expect(s.y).toBe(1);
  });
});
