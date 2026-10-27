import { afterEach, describe, expect, it } from "vitest";
import {
  RELIEF_BRIGHTNESS_RANGE,
  clearMaterials,
  reliefCallGlsl,
  resolveRelief,
  setRelief,
} from "../../packages/gpu/src/materials/relief.ts";

afterEach(() => clearMaterials());

describe("M3d relief material", () => {
  it("resolves bevel/depth and clamps brightness for text contrast", () => {
    const soft = resolveRelief({ kind: "relief", bevel: 0.05, depth: 0.1 });
    const hard = resolveRelief({ kind: "relief", bevel: 0.5, depth: 1 });

    expect(soft.kind).toBe("relief");
    expect(soft.bevel).toBeCloseTo(0.05, 5);
    expect(soft.depth).toBeCloseTo(0.1, 5);
    expect(soft.brightness).toBeGreaterThanOrEqual(RELIEF_BRIGHTNESS_RANGE.min);
    expect(soft.brightness).toBeLessThanOrEqual(RELIEF_BRIGHTNESS_RANGE.max);
    expect(hard.brightness).toBeLessThanOrEqual(RELIEF_BRIGHTNESS_RANGE.max);
    // Stronger relief is a bit brighter (edge highlight), still clamped.
    expect(hard.brightness).toBeGreaterThanOrEqual(soft.brightness);
  });

  it("clamps out-of-range bevel/depth", () => {
    const r = resolveRelief({ kind: "relief", bevel: 9, depth: -2 });
    expect(r.bevel).toBe(0.5);
    expect(r.depth).toBe(0);
  });

  it("emits a brightness-safe GLSL call", () => {
    const r = resolveRelief({ kind: "relief" });
    const glsl = reliefCallGlsl(r);
    expect(glsl).toContain("figmentRelief(c, uv");
    expect(glsl).toContain(r.brightness.toFixed(4));
  });

  it("setRelief stores per-layer material", () => {
    const a = setRelief("panel", { kind: "relief", bevel: 0.2, depth: 0.4 });
    expect(a.bevel).toBeCloseTo(0.2, 5);
  });
});
