import { afterEach, describe, expect, it } from "vitest";
import {
  GLASS_REFRACTION_MAX,
  clearGlassMaterials,
  glassCallGlsl,
  resolveGlass,
  setGlass,
} from "../../packages/gpu/src/materials/glass.ts";

afterEach(() => clearGlassMaterials());

describe("M3f glass material", () => {
  it("clamps ior/refraction for readability", () => {
    const flat = resolveGlass({ kind: "glass", ior: 1 });
    expect(flat.refraction).toBe(0);

    const strong = resolveGlass({ kind: "glass", ior: 2.5, dispersion: 1 });
    expect(strong.refraction).toBeLessThanOrEqual(GLASS_REFRACTION_MAX);
    expect(strong.dispersion).toBe(1);

    const crazy = resolveGlass({ kind: "glass", ior: 99, frost: 5 });
    expect(crazy.ior).toBe(2.5);
    expect(crazy.refraction).toBe(GLASS_REFRACTION_MAX);
    expect(crazy.frost).toBe(1);
  });

  it("parses tint and emits GLSL call", () => {
    const g = resolveGlass({ kind: "glass", tint: "#c8d8ff" });
    expect(g.tint.r).toBeCloseTo(0xc8 / 255, 5);
    const call = glassCallGlsl(g);
    expect(call).toContain("figmentGlass(u_tex, uv");
    expect(call).toContain("vec3(");
  });

  it("rejects bad tint", () => {
    expect(() => resolveGlass({ kind: "glass", tint: "zzz" })).toThrow(/hex/);
  });

  it("setGlass stores per-layer glass", () => {
    const g = setGlass("palette", { kind: "glass", ior: 1.4, dispersion: 0.3 });
    expect(g.ior).toBeCloseTo(1.4, 5);
    expect(g.dispersion).toBeCloseTo(0.3, 5);
  });
});
