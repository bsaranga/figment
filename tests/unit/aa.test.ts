import { describe, expect, it } from "vitest";
import {
  EDGE_AA_PX,
  GLSL_EDGE_AA,
  WGSL_EDGE_AA,
} from "../../packages/host/src/backend/aa.ts";

describe("M2i edge AA assets", () => {
  it("exports a pixel-sized AA width", () => {
    expect(EDGE_AA_PX).toBeGreaterThan(0);
    expect(EDGE_AA_PX).toBeLessThanOrEqual(4);
  });

  it("GLSL and WGSL helpers share premultiplied edge coverage", () => {
    expect(GLSL_EDGE_AA).toContain("figmentEdgeAA");
    expect(GLSL_EDGE_AA).toContain("figmentSamplePremul");
    expect(GLSL_EDGE_AA).toContain("smoothstep");
    expect(WGSL_EDGE_AA).toContain("figmentEdgeAA");
    expect(WGSL_EDGE_AA).toContain("figmentSamplePremul");
  });
});
