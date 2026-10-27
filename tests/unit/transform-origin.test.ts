import { describe, expect, it } from "vitest";
import {
  applyAffine,
  composeAffine,
  IDENTITY_TRANSFORM,
} from "../../packages/host/src/geometry.ts";
import { resolveOrigin } from "../../packages/host/src/layers.ts";

describe("resolveOrigin", () => {
  const size = { x: 100, y: 40 };

  it("top-left is (0,0)", () => {
    expect(resolveOrigin("top-left", size)).toEqual({ x: 0, y: 0 });
  });

  it("center is half the box", () => {
    expect(resolveOrigin("center", size)).toEqual({ x: 50, y: 20 });
  });

  it("fractional origin maps to the box", () => {
    expect(resolveOrigin({ x: 0.25, y: 0.5 }, size)).toEqual({ x: 25, y: 20 });
  });
});

describe("composeAffine pivot (M2e)", () => {
  it("rotate 90° about center keeps the center fixed", () => {
    const size = { x: 100, y: 40 };
    const origin = resolveOrigin("center", size);
    const m = composeAffine(
      { ...IDENTITY_TRANSFORM, rotation: 90 },
      origin,
    );
    const center = applyAffine(m, { x: 50, y: 20 });
    expect(center.x).toBeCloseTo(50, 10);
    expect(center.y).toBeCloseTo(20, 10);
  });

  it("rotate 90° about top-left keeps (0,0) fixed", () => {
    const origin = resolveOrigin("top-left", { x: 100, y: 40 });
    const m = composeAffine(
      { ...IDENTITY_TRANSFORM, rotation: 90 },
      origin,
    );
    const tl = applyAffine(m, { x: 0, y: 0 });
    expect(tl.x).toBeCloseTo(0, 10);
    expect(tl.y).toBeCloseTo(0, 10);

    // A corner that should move under top-left pivot.
    const br = applyAffine(m, { x: 100, y: 40 });
    expect(Math.abs(br.x) + Math.abs(br.y)).toBeGreaterThan(1);
  });

  it("rotate 180° about center maps the box onto itself", () => {
    const size = { x: 100, y: 40 };
    const origin = resolveOrigin("center", size);
    const m = composeAffine(
      { ...IDENTITY_TRANSFORM, rotation: 180 },
      origin,
    );
    const a = applyAffine(m, { x: 0, y: 0 });
    const b = applyAffine(m, { x: 100, y: 40 });
    expect(a.x).toBeCloseTo(100, 10);
    expect(a.y).toBeCloseTo(40, 10);
    expect(b.x).toBeCloseTo(0, 10);
    expect(b.y).toBeCloseTo(0, 10);
  });
});
