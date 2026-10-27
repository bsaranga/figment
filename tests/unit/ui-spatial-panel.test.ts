import { describe, expect, it } from "vitest";
import {
  FigmentSpatialPanel,
  SPATIAL_PANEL_ATTRIBUTES,
  registerSpatialPanel,
} from "../../packages/ui/src/spatial-panel.ts";

describe("M4b spatial panel", () => {
  it("exposes move/tilt/z/material attributes", () => {
    registerSpatialPanel();
    expect(FigmentSpatialPanel).toBeTruthy();
    expect(SPATIAL_PANEL_ATTRIBUTES).toContain("z");
    expect(SPATIAL_PANEL_ATTRIBUTES).toContain("material");
    expect(SPATIAL_PANEL_ATTRIBUTES).toContain("rotate-x");
    expect(FigmentSpatialPanel.observedAttributes).toEqual(
      SPATIAL_PANEL_ATTRIBUTES,
    );
  });
});
