import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOKENS,
  resolveTokens,
  tokenVar,
  tokensToCss,
} from "../../packages/ui/src/tokens.ts";

describe("M4a design tokens", () => {
  it("ships a full --figment-* surface", () => {
    const keys = Object.keys(DEFAULT_TOKENS);
    expect(keys.every((k) => k.startsWith("--figment-"))).toBe(true);
    expect(keys).toEqual(
      expect.arrayContaining([
        "--figment-color-bg",
        "--figment-color-accent",
        "--figment-radius-md",
        "--figment-space-3",
        "--figment-text-md",
        "--figment-duration-base",
        "--figment-glass-tint",
        "--figment-bevel-depth",
      ]),
    );
  });

  it("merges overrides", () => {
    const t = resolveTokens({ "--figment-color-accent": "#ff0000" });
    expect(t["--figment-color-accent"]).toBe("#ff0000");
    expect(t["--figment-color-bg"]).toBe(DEFAULT_TOKENS["--figment-color-bg"]);
  });

  it("serializes to CSS :root", () => {
    const css = tokensToCss(DEFAULT_TOKENS);
    expect(css.startsWith(":root {")).toBe(true);
    expect(css).toContain("--figment-color-bg: #0b0d12;");
    expect(css).toContain("--figment-ease-out:");
    expect(tokensToCss(DEFAULT_TOKENS, ".theme-dark")).toContain(".theme-dark {");
  });

  it("tokenVar wraps a custom property", () => {
    expect(tokenVar("--figment-radius-lg")).toBe("var(--figment-radius-lg)");
  });
});
