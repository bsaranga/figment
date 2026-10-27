import { describe, expect, it } from "vitest";
import {
  FigmentContextMenu,
  registerContextMenu,
} from "../../packages/ui/src/context-menu.ts";
import { FigmentTooltip, registerTooltip } from "../../packages/ui/src/tooltip.ts";

describe("M4g context menu + tooltip", () => {
  it("defines kit elements", () => {
    registerContextMenu();
    registerTooltip();
    expect(FigmentContextMenu).toBeTruthy();
    expect(FigmentTooltip).toBeTruthy();
  });
});
