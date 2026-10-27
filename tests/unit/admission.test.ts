import { describe, expect, it } from "vitest";
import {
  colorMatches,
  parseHexColor,
  PROBE_COLOR,
} from "../../packages/host/src/admission.ts";

describe("parseHexColor", () => {
  it("parses #rgb shorthand", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it("parses #rrggbb", () => {
    expect(parseHexColor(PROBE_COLOR)).toEqual({
      r: 194,
      g: 63,
      b: 83,
      a: 255,
    });
  });

  it("rejects garbage", () => {
    expect(() => parseHexColor("nope")).toThrow(/hex color/);
  });
});

describe("colorMatches", () => {
  const expected = parseHexColor(PROBE_COLOR);

  it("accepts exact and near samples (AA slack)", () => {
    expect(colorMatches(expected, expected)).toBe(true);
    expect(
      colorMatches(expected, { r: 200, g: 70, b: 90, a: 255 }, 12),
    ).toBe(true);
  });

  it("rejects wrong hue and transparent samples", () => {
    expect(
      colorMatches(expected, { r: 10, g: 200, b: 200, a: 255 }, 12),
    ).toBe(false);
    expect(
      colorMatches(expected, { r: 194, g: 63, b: 83, a: 100 }, 12),
    ).toBe(false);
  });
});
