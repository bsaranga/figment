import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_EMITTERS,
  clearEmitters,
  lightUniformGlsl,
  pointerEmitter,
  resolveEmitter,
  resolveEmitters,
  setEmitters,
} from "../../packages/gpu/src/emitters.ts";

afterEach(() => clearEmitters());

describe("M3g emitters", () => {
  it("clamps emitter params and caps count", () => {
    const e = resolveEmitter({
      id: "p",
      x: 5,
      y: -2,
      r: 2,
      g: 0,
      b: -1,
      intensity: 10,
      radius: 0,
    });
    expect(e.x).toBe(2);
    expect(e.y).toBe(-1);
    expect(e.r).toBe(1);
    expect(e.b).toBe(0);
    expect(e.intensity).toBe(4);
    expect(e.radius).toBe(0.05);

    const many = resolveEmitters(
      Array.from({ length: 6 }, (_, i) => ({
        id: `e${i}`,
        x: 0,
        y: 0,
        r: 1,
        g: 1,
        b: 1,
      })),
    );
    expect(many).toHaveLength(MAX_EMITTERS);
  });

  it("emits light GLSL that scales RGB only (no pixel move)", () => {
    const glsl = lightUniformGlsl([
      resolveEmitter({ id: "a", x: 0.5, y: 0.5, r: 1, g: 0.5, b: 0, intensity: 1, radius: 0.3 }),
    ]);
    expect(glsl).toContain("figmentLight(c, uv");
    expect(glsl).toContain("vec3(1.0000, 0.5000, 0.0000)");
    // Empty lights → identity relight.
    expect(lightUniformGlsl([])).toContain("vec3(1.0)");
  });

  it("pointerEmitter is a warm cursor light", () => {
    const p = pointerEmitter(0.2, 0.8);
    expect(p.id).toBe("pointer");
    expect(p.x).toBeCloseTo(0.2, 5);
    expect(p.r).toBeGreaterThan(p.b);
  });

  it("setEmitters stores per-layer lights", () => {
    const list = setEmitters("panel", [pointerEmitter(0.1, 0.1)]);
    expect(list).toHaveLength(1);
  });
});
