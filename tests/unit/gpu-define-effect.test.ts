import { afterEach, describe, expect, it } from "vitest";
import {
  clearEffects,
  compileEffect,
  defineEffect,
  extractExpression,
  getEffect,
  validateEffectDefinition,
} from "../../packages/gpu/src/effects/schema.ts";

afterEach(() => clearEffects());

describe("M3c defineEffect schema", () => {
  it("compiles expression and full-function forms", () => {
    expect(extractExpression("c * 0.5")).toContain("c * 0.5");
    expect(extractExpression("vec4 f(vec4 c) { return c; }")).toContain("return c");
  });

  it("rejects invalid definitions", () => {
    expect(() => validateEffectDefinition({
      id: "bad-id",
      wgsl: "c",
      params: [],
    })).toThrow(/defineEffect/);
    expect(() => compileEffect({
      id: "ok",
      wgsl: "",
      params: [],
    })).toThrow(/wgsl/);
    expect(() => compileEffect({
      id: "ok",
      wgsl: "gl_FragColor = c;",
      params: [],
    })).toThrow(/frozen color function/);
    expect(() => compileEffect({
      id: "ok",
      wgsl: "c",
      params: [{ name: "a", min: 1, max: 0 }],
    })).toThrow(/min > max/);
  });

  it("compile-then-publish: failed compile leaves registry empty", () => {
    expect(() =>
      defineEffect({
        id: "x",
        wgsl: "float(",
        params: [],
      }),
    ).toThrow();
    expect(getEffect("x")).toBeUndefined();
  });

  it("publishes a compiled custom effect", () => {
    const pub = defineEffect({
      id: "sepia",
      wgsl: "vec4(c.r, c.g * 0.8, c.b * 0.5, c.a)",
      params: [{ name: "mix", min: 0, max: 1 }],
    });
    expect(pub.id).toBe("sepia");
    expect(pub.glsl).toContain("figmentCustom_sepia");
    expect(getEffect("sepia")).toEqual(pub);
  });

  it("requires defineEffect before use in a chain", async () => {
    const { validateEffectChain } = await import(
      "../../packages/gpu/src/composite.ts"
    );
    expect(() =>
      validateEffectChain([{ kind: "custom", id: "missing", params: {} }]),
    ).toThrow(/not defined/);
    defineEffect({ id: "ok", wgsl: "c", params: [] });
    expect(() =>
      validateEffectChain([{ kind: "custom", id: "ok", params: {} }]),
    ).not.toThrow();
  });
});
