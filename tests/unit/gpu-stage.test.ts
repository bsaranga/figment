import { afterEach, describe, expect, it } from "vitest";
import {
  clearStageMaterials,
  resolveStage,
  setStage,
  stageCallGlsl,
} from "../../packages/gpu/src/materials/stage.ts";

afterEach(() => clearStageMaterials());

describe("M3e stage material", () => {
  it("resolves tint/vignette/grain with clamps", () => {
    const s = resolveStage({
      kind: "stage",
      tint: "#12161f",
      vignette: 2,
      grain: -1,
    });
    expect(s.tint.r).toBeCloseTo(0x12 / 255, 5);
    expect(s.vignette).toBe(1);
    expect(s.grain).toBe(0);

    const def = resolveStage({ kind: "stage" });
    expect(def.vignette).toBeCloseTo(0.45, 5);
    expect(def.grain).toBeCloseTo(0.08, 5);
  });

  it("rejects bad tint", () => {
    expect(() => resolveStage({ kind: "stage", tint: "nope" })).toThrow(/hex/);
  });

  it("emits stage GLSL call", () => {
    const s = resolveStage({ kind: "stage" });
    expect(stageCallGlsl(s)).toContain("figmentStage(c, uv");
  });

  it("setStage stores per-layer ground", () => {
    const s = setStage("ground", { kind: "stage", vignette: 0.2 });
    expect(s.vignette).toBeCloseTo(0.2, 5);
  });
});
