import { describe, expect, it } from "vitest";
import {
  FigmentCommandPalette,
  registerCommandPalette,
} from "../../packages/ui/src/command-palette.ts";

describe("M4e command palette", () => {
  it("registers the kit element", () => {
    registerCommandPalette();
    expect(FigmentCommandPalette).toBeTruthy();
  });
});
