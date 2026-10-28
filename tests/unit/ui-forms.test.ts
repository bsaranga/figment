import { describe, expect, it } from "vitest";
import {
  FigmentCheckbox,
  FigmentInput,
  FigmentSelect,
  FigmentSlider,
  registerFormControls,
} from "../../packages/ui/src/forms.ts";

describe("M5b form controls", () => {
  it("defines native-backed field elements", () => {
    registerFormControls();
    expect(FigmentInput).toBeTruthy();
    expect(FigmentSelect).toBeTruthy();
    expect(FigmentSlider).toBeTruthy();
    expect(FigmentCheckbox).toBeTruthy();
  });
});
