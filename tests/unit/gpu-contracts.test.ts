import { afterEach, describe, expect, it } from "vitest";
import {
  CONTRACTS,
  assertContract,
  clearInteractionModes,
  getInteractionMode,
  operationMovesPixels,
  recheckContract,
  setInteractionMode,
  withInert,
} from "../../packages/gpu/src/contracts.ts";
import { validateEffectChain } from "../../packages/gpu/src/composite.ts";

afterEach(() => clearInteractionModes());

describe("M3k interaction contracts", () => {
  it("encodes the safety table", () => {
    expect(CONTRACTS.decorative.mayMovePixels).toBe(true);
    expect(CONTRACTS.decorative.allowLiveControls).toBe(false);
    expect(CONTRACTS.material.mayMovePixels).toBe(false);
    expect(CONTRACTS.material.allowLiveControls).toBe(true);
    expect(CONTRACTS.inert.requireInert).toBe(true);
  });

  it("classifies operations", () => {
    expect(operationMovesPixels("effect")).toBe(true);
    expect(operationMovesPixels("material", "glass")).toBe(true);
    expect(operationMovesPixels("material", "relief")).toBe(false);
    expect(operationMovesPixels("light")).toBe(false);
  });

  it("throws when material mode gets a pixel-moving effect on live controls", () => {
    expect(() =>
      assertContract({
        mode: "material",
        content: { hasLiveControls: true },
        operation: "effect",
      }),
    ).toThrow(/forbids pixel-moving/);
  });

  it("allows material + live controls for relight / relief", () => {
    expect(() =>
      assertContract({
        mode: "material",
        content: { hasLiveControls: true },
        operation: "light",
      }),
    ).not.toThrow();
    expect(() =>
      assertContract({
        mode: "material",
        content: { hasLiveControls: true },
        operation: "material",
        kind: "relief",
      }),
    ).not.toThrow();
  });

  it("decorative requires inert/aria-hidden and rejects live controls", () => {
    expect(() =>
      assertContract({
        mode: "decorative",
        content: {},
        operation: "effect",
      }),
    ).toThrow(/requires inert/);

    expect(() =>
      assertContract({
        mode: "decorative",
        content: { inertOrAriaHidden: true, hasLiveControls: true },
        operation: "effect",
      }),
    ).toThrow(/live controls/);

    expect(() =>
      assertContract({
        mode: "decorative",
        content: { inertOrAriaHidden: true },
        operation: "effect",
      }),
    ).not.toThrow();
  });

  it("inert mode allows pixel-moving when currentlyInert", () => {
    expect(() =>
      assertContract({
        mode: "inert",
        content: { currentlyInert: true },
        operation: "effect",
      }),
    ).not.toThrow();
    expect(() =>
      assertContract({
        mode: "inert",
        content: {},
        operation: "effect",
      }),
    ).toThrow(/requires inert/);
  });

  it("recheckContract is the mutation-time hook", () => {
    expect(() =>
      recheckContract({
        mode: "material",
        content: { hasLiveControls: true },
        operation: "effect",
      }),
    ).toThrow(/forbids pixel-moving/);
  });

  it("withInert temporarily marks the element", () => {
    const stub = {
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
    } as unknown as HTMLElement;
    const seen: string[] = [];
    withInert(stub, () => {
      seen.push("ran");
    });
    expect(seen).toEqual(["ran"]);
  });

  it("validateEffectChain accepts a contract context", () => {
    expect(() =>
      validateEffectChain([{ kind: "dissolve", progress: 0.5 }], {
        mode: "material",
        content: { hasLiveControls: true },
      }),
    ).toThrow(/forbids pixel-moving/);
  });

  it("stores per-layer default modes", () => {
    setInteractionMode("toast", "decorative");
    expect(getInteractionMode("toast")).toBe("decorative");
    expect(getInteractionMode("unknown")).toBe("material");
  });
});
