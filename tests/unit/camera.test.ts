import { describe, expect, it } from "vitest";
import {
  clipReason,
  depthScale,
  defaultCamera,
  isVisible,
  layerCssTransform3D,
  projectPoint,
  viewZ,
} from "../../packages/host/src/camera.ts";

describe("viewZ / depthScale (M2j)", () => {
  const cam = defaultCamera();

  it("layer z is measured against the camera", () => {
    expect(viewZ(100, cam)).toBe(100);
    expect(viewZ(100, { ...cam, z: 40 })).toBe(60);
    expect(viewZ(-200, { ...cam, z: -50 })).toBe(-150);
  });

  it("z=0 is scale 1; positive z (toward viewer) enlarges", () => {
    expect(depthScale(0, 1200)).toBeCloseTo(1, 10);
    const s = depthScale(200, 1200)!;
    expect(s).toBeGreaterThan(1);
    expect(s).toBeCloseTo(1200 / 1000, 10);
  });

  it("negative z (away) shrinks", () => {
    const s = depthScale(-400, 1200)!;
    expect(s).toBeLessThan(1);
    expect(s).toBeCloseTo(1200 / 1600, 10);
  });

  it("behind the camera has no scale", () => {
    expect(depthScale(1200, 1200)).toBeNull();
    expect(depthScale(1300, 1200)).toBeNull();
  });
});

describe("clipReason (near/far)", () => {
  const cam = defaultCamera();

  it("marks near, far, and behind-camera by camera distance", () => {
    // z=0 at camera z=0 sits at distance = perspective → front.
    expect(clipReason(0, cam)).toBe("front");
    expect(clipReason(100, cam)).toBe("front");
    // distance = 800 - 750 = 50 < near 100 → near-clipped.
    const tight = { ...cam, perspective: 800, near: 100, far: 2000 };
    expect(clipReason(750, tight)).toBe("near");
    expect(clipReason(650, tight)).toBe("front");
    // distance = 800 - (-2000) = 2800 > far 2000 → far-clipped.
    expect(clipReason(-2000, tight)).toBe("far");
    // viewZ >= perspective → behind camera.
    expect(clipReason(800, tight)).toBe("behind-camera");
    expect(isVisible(650, tight)).toBe(true);
    expect(isVisible(750, tight)).toBe(false);
  });
});

describe("projectPoint", () => {
  const cam = defaultCamera();
  const origin = { x: 100, y: 50 };

  it("scales toward the vanishing point", () => {
    const p = projectPoint({ x: 120, y: 50 }, 200, cam, origin)!;
    // scale = 1200/1000 = 1.2 → x = 100 + 20*1.2 = 124
    expect(p.x).toBeCloseTo(124, 6);
    expect(p.scale).toBeCloseTo(1.2, 6);
  });

  it("returns null behind the camera", () => {
    expect(projectPoint({ x: 0, y: 0 }, 2000, cam, origin)).toBeNull();
  });
});

describe("layerCssTransform3D", () => {
  it("emits explicit depth scale + translate", () => {
    const css = layerCssTransform3D({
      x: 10,
      y: 20,
      z: -100,
      perspective: 1200,
    });
    // scale = 1200/1300 ≈ 0.923
    expect(css).toContain("scale(");
    expect(css).toContain("translate(10px, 20px)");
    expect(layerCssTransform3D({ x: 0, y: 0, z: 0, rotation: 45 })).toContain(
      "rotate(45deg)",
    );
    expect(layerCssTransform3D({ x: 0, y: 0, z: 0 })).toBe("none");
  });
});
