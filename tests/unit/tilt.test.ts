import { describe, expect, it } from "vitest";
import {
  clampTiltDeg,
  composeTiltMatrix,
  cornersInFront,
  tiltFacingViewer,
  tiltToCss,
  MAX_TILT_DEG,
} from "../../packages/host/src/tilt.ts";

describe("clampTiltDeg", () => {
  it("clamps to ±60", () => {
    expect(clampTiltDeg(90)).toBe(MAX_TILT_DEG);
    expect(clampTiltDeg(-90)).toBe(-MAX_TILT_DEG);
    expect(clampTiltDeg(25)).toBe(25);
  });
});

describe("tiltToCss", () => {
  it("emits perspective + rotateX/Y", () => {
    const css = tiltToCss({ x: 15, y: -20, perspective: 800 }, 0.5, 0.5);
    expect(css).toContain("perspective(800px)");
    expect(css).toContain("rotateX(15deg)");
    expect(css).toContain("rotateY(-20deg)");
  });
});

describe("composeTiltMatrix (M2f)", () => {
  const box = { width: 100, height: 60 };

  it("identity tilt is near-identity mapping of corners", () => {
    const pm = composeTiltMatrix({
      tilt: { x: 0, y: 0 },
      ...box,
    });
    const corners = cornersInFront(pm, box.width, box.height);
    const tl = corners.find((c) => c.corner === "tl")!;
    expect(tl.x).toBeCloseTo(0, 5);
    expect(tl.y).toBeCloseTo(0, 5);
    expect(tl.front).toBe(true);
    expect(tiltFacingViewer(pm, box.width, box.height)).toBe(true);
  });

  it("rotateY keeps all corners in front for moderate tilt", () => {
    const pm = composeTiltMatrix({
      tilt: { x: 0, y: 35, perspective: 1000 },
      ...box,
    });
    expect(tiltFacingViewer(pm, box.width, box.height)).toBe(true);
    const corners = cornersInFront(pm, box.width, box.height);
    // Y-rotation should pull left/right corners toward the center in x.
    const tl = corners.find((c) => c.corner === "tl")!;
    const tr = corners.find((c) => c.corner === "tr")!;
    expect(Math.abs(tr.x - tl.x)).toBeLessThan(box.width);
  });

  it("rotateX foreshortens height", () => {
    const pm = composeTiltMatrix({
      tilt: { x: 40, y: 0, perspective: 1000 },
      ...box,
    });
    const corners = cornersInFront(pm, box.width, box.height);
    const tl = corners.find((c) => c.corner === "tl")!;
    const bl = corners.find((c) => c.corner === "bl")!;
    expect(Math.abs(bl.y - tl.y)).toBeLessThan(box.height);
    expect(tiltFacingViewer(pm, box.width, box.height)).toBe(true);
  });

  it("exposes perspective and clamped angles", () => {
    const pm = composeTiltMatrix({
      tilt: { x: 80, y: 10, perspective: 0 },
      ...box,
    });
    expect(pm.tiltX).toBe(MAX_TILT_DEG);
    expect(pm.tiltY).toBe(10);
    expect(pm.perspective).toBeGreaterThan(0);
  });
});
