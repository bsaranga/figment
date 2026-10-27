import { describe, expect, it } from "vitest";
import {
  FigmentLayerStack,
  registerLayerStack,
} from "../../packages/ui/src/layer-stack.ts";
import {
  FigmentMinimap,
  registerMinimap,
} from "../../packages/ui/src/minimap.ts";

describe("M4d layer stack + minimap", () => {
  it("defines kit elements", () => {
    registerLayerStack();
    registerMinimap();
    expect(FigmentLayerStack).toBeTruthy();
    expect(FigmentMinimap).toBeTruthy();
  });
});
