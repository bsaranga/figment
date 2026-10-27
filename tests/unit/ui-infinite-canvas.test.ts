import { describe, expect, it } from "vitest";
import {
  FigmentInfiniteCanvas,
  registerInfiniteCanvas,
} from "../../packages/ui/src/infinite-canvas.ts";

describe("M4c infinite canvas", () => {
  it("exposes view attributes and register is Node-safe", () => {
    registerInfiniteCanvas();
    expect(FigmentInfiniteCanvas).toBeTruthy();
    expect(FigmentInfiniteCanvas.observedAttributes).toContain("scale");
    expect(FigmentInfiniteCanvas.observedAttributes).toContain("view-x");
    expect(FigmentInfiniteCanvas.observedAttributes).toContain("view-y");
  });
});
