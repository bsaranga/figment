import { afterEach, describe, expect, it } from "vitest";
import {
  PROTECT_LIGHT_MAX,
  PROTECT_LIGHT_MIN,
  clearProtectedText,
  protectLightGlsl,
  resolveProtectedRect,
  setProtectedText,
} from "../../packages/gpu/src/protected-text.ts";

afterEach(() => clearProtectedText());

describe("M3h protected text rects", () => {
  it("clamps rect strength and size", () => {
    const r = resolveProtectedRect({
      x: 0.1,
      y: 0.2,
      width: 0.5,
      height: 0.2,
      strength: 9,
    });
    expect(r.strength).toBe(1);
    expect(r.width).toBe(0.5);
  });

  it("emits light-clamp GLSL for protected copy", () => {
    const glsl = protectLightGlsl([
      resolveProtectedRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.2 }),
    ]);
    expect(glsl).toContain("mix(");
    expect(glsl).toContain("clamp(");
    expect(glsl).toContain(PROTECT_LIGHT_MIN.toFixed(3));
    expect(glsl).toContain(PROTECT_LIGHT_MAX.toFixed(3));
  });

  it("setProtectedText stores per-layer rects", () => {
    const list = setProtectedText("hud", [
      { x: 0, y: 0, width: 1, height: 0.3 },
    ]);
    expect(list).toHaveLength(1);
  });
});
