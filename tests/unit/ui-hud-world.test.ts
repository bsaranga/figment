import { describe, expect, it } from "vitest";
import { FigmentHud, registerHud } from "../../packages/ui/src/hud.ts";
import {
  FigmentWorldSpacePanel,
  registerWorldSpacePanel,
} from "../../packages/ui/src/world-space-panel.ts";

describe("M5c HUD + world-space panel", () => {
  it("defines kit elements", () => {
    registerHud();
    registerWorldSpacePanel();
    expect(FigmentHud).toBeTruthy();
    expect(FigmentWorldSpacePanel).toBeTruthy();
  });
});
