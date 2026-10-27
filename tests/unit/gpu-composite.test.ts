import { describe, expect, it } from "vitest";
import {
  MAX_EFFECT_OPS,
  buildEffectGlsl,
  validateEffectChain,
  type EffectDesc,
} from "../../packages/gpu/src/composite.ts";

describe("M3a effect chain budget", () => {
  it("caps chains at 3 ops", () => {
    expect(MAX_EFFECT_OPS).toBe(3);
    const ok: EffectDesc[] = [
      { kind: "ripple", amplitude: 0.2 },
      { kind: "chromatic", offset: 0.1 },
      { kind: "dissolve", progress: 0.5 },
    ];
    expect(validateEffectChain(ok)).toHaveLength(3);
    expect(() =>
      validateEffectChain([
        ...ok,
        { kind: "dissolve", progress: 0 },
      ]),
    ).toThrow(/shader budget/);
  });

  it("rejects invalid params", () => {
    expect(() =>
      validateEffectChain([{ kind: "dissolve", progress: 2 }]),
    ).toThrow(/0\.\.1/);
    expect(() =>
      validateEffectChain([{ kind: "custom", id: "", params: {} }]),
    ).toThrow(/id/);
  });

  it("builds GLSL for a chain", () => {
    const src = buildEffectGlsl([
      { kind: "ripple", amplitude: 0.25 },
      { kind: "chromatic", offset: 0.5 },
    ]);
    expect(src).toContain("figmentRipple");
    expect(src).toContain("figmentChromatic");
    expect(src).toContain("return c2");
    expect(buildEffectGlsl([])).toContain("return base");
  });
});
