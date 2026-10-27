import { describe, expect, it } from "vitest";
import {
  FigmentVirtualList,
  registerVirtualList,
} from "../../packages/ui/src/virtual-list.ts";
import {
  FigmentVirtualGrid,
  registerVirtualGrid,
} from "../../packages/ui/src/virtual-grid.ts";

describe("M5a virtual list + grid", () => {
  it("defines kit elements", () => {
    registerVirtualList();
    registerVirtualGrid();
    expect(FigmentVirtualList).toBeTruthy();
    expect(FigmentVirtualGrid).toBeTruthy();
  });
});
