import { describe, expect, it } from "vitest";
import {
  EFFECT_GLSL_LIB,
  effectColorGlsl,
  effectUvGlsl,
} from "../../packages/gpu/src/effects/sampling.ts";

describe("M3b effect sampling GLSL", () => {
  it("ships ripple / chromatic / dissolve helpers", () => {
    expect(EFFECT_GLSL_LIB).toContain("figmentRippleUV");
    expect(EFFECT_GLSL_LIB).toContain("figmentChromaticSample");
    expect(EFFECT_GLSL_LIB).toContain("figmentDissolveSample");
    expect(EFFECT_GLSL_LIB).toContain("figmentNoise");
  });

  it("ripple warps UV before sample", () => {
    const uv = effectUvGlsl({ kind: "ripple", amplitude: 0.5, edge: 0.8 });
    expect(uv).toContain("figmentRippleUV(uv, 0.5000, 0.8000)");
    const col = effectColorGlsl({ kind: "ripple", amplitude: 0.5 });
    expect(col).toContain("texture2D(u_tex, uv)");
  });

  it("chromatic and dissolve resample the texture", () => {
    expect(effectColorGlsl({ kind: "chromatic", offset: 0.02 })).toContain(
      "figmentChromaticSample",
    );
    expect(effectColorGlsl({ kind: "dissolve", progress: 0.3 })).toContain(
      "figmentDissolveSample",
    );
    // No UV warp for these — they sample at the current uv.
    expect(effectUvGlsl({ kind: "chromatic", offset: 0.1 })).toBe("");
  });
});
