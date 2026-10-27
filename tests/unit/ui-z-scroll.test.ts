import { describe, expect, it } from "vitest";
import {
  FigmentZScroll,
  registerZScroll,
} from "../../packages/ui/src/z-scroll.ts";

describe("M4b2 z-scroll", () => {
  it("exposes camera track attributes", () => {
    registerZScroll();
    expect(FigmentZScroll).toBeTruthy();
    expect(FigmentZScroll.observedAttributes).toContain("camera-from");
    expect(FigmentZScroll.observedAttributes).toContain("camera-to");
    expect(FigmentZScroll.observedAttributes).toContain("perspective");
    expect(FigmentZScroll.observedAttributes).toContain("track-height");
  });
});
