import { describe, expect, it } from "vitest";
import { FigmentModal, registerModal } from "../../packages/ui/src/modal.ts";
import { FigmentToast, registerToast } from "../../packages/ui/src/toast.ts";

describe("M4f modal + toast", () => {
  it("defines kit elements", () => {
    registerModal();
    registerToast();
    expect(FigmentModal).toBeTruthy();
    expect(FigmentToast).toBeTruthy();
  });
});
