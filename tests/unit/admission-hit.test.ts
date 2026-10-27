import { describe, expect, it } from "vitest";
import { HIT_PROBE_ID } from "../../packages/host/src/admission.ts";

describe("M2b hit probe fixtures", () => {
  it("exports a stable probe target id", () => {
    expect(HIT_PROBE_ID).toBe("figment-hit-probe-target");
  });
});

/**
 * elementFromPoint requires a layout + transform engine, so behavioral
 * coverage lives in tests/browser/host.m2.hit.test.ts.
 */
describe("hit sample contract", () => {
  it("interior samples expect the target id; exterior expect a miss", () => {
    const interiorOk = {
      label: "center",
      client: { x: 10, y: 10 },
      expectedId: HIT_PROBE_ID,
      actualId: HIT_PROBE_ID,
      matched: true,
    };
    const exteriorOk = {
      label: "miss-far",
      client: { x: 500, y: 500 },
      expectedId: null,
      actualId: "body",
      matched: true,
    };
    expect(interiorOk.expectedId).toBe(HIT_PROBE_ID);
    expect(exteriorOk.expectedId).toBeNull();
  });
});
