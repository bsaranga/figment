/**
 * M4a — design tokens (`--figment-*`).
 * Themable in DOM mode and canvas mode. CSS custom properties + JS map.
 * See ARCHITECTURE.md §5.2.
 */

export type TokenGroup =
  | "color"
  | "radius"
  | "space"
  | "type"
  | "motion"
  | "material";

export interface FigmentTokens {
  /** Color */
  "--figment-color-bg": string;
  "--figment-color-surface": string;
  "--figment-color-text": string;
  "--figment-color-muted": string;
  "--figment-color-accent": string;
  "--figment-color-border": string;
  /** Radius */
  "--figment-radius-sm": string;
  "--figment-radius-md": string;
  "--figment-radius-lg": string;
  /** Space */
  "--figment-space-1": string;
  "--figment-space-2": string;
  "--figment-space-3": string;
  "--figment-space-4": string;
  /** Type scale */
  "--figment-font-sans": string;
  "--figment-font-mono": string;
  "--figment-text-xs": string;
  "--figment-text-sm": string;
  "--figment-text-md": string;
  "--figment-text-lg": string;
  /** Motion */
  "--figment-duration-fast": string;
  "--figment-duration-base": string;
  "--figment-duration-slow": string;
  "--figment-ease-out": string;
  "--figment-ease-in-out": string;
  /** Material defaults */
  "--figment-glass-tint": string;
  "--figment-bevel-depth": string;
  "--figment-stage-tint": string;
}

export const DEFAULT_TOKENS: FigmentTokens = {
  "--figment-color-bg": "#0b0d12",
  "--figment-color-surface": "#151a24",
  "--figment-color-text": "#e8ecf4",
  "--figment-color-muted": "#8b9bb4",
  "--figment-color-accent": "#7c9cff",
  "--figment-color-border": "rgba(148, 163, 204, 0.18)",
  "--figment-radius-sm": "8px",
  "--figment-radius-md": "14px",
  "--figment-radius-lg": "22px",
  "--figment-space-1": "4px",
  "--figment-space-2": "8px",
  "--figment-space-3": "16px",
  "--figment-space-4": "24px",
  "--figment-font-sans":
    '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
  "--figment-font-mono": '"SF Mono", ui-monospace, Menlo, monospace',
  "--figment-text-xs": "12px",
  "--figment-text-sm": "14px",
  "--figment-text-md": "16px",
  "--figment-text-lg": "22px",
  "--figment-duration-fast": "120ms",
  "--figment-duration-base": "220ms",
  "--figment-duration-slow": "420ms",
  "--figment-ease-out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "--figment-ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "--figment-glass-tint": "#c8d8ff",
  "--figment-bevel-depth": "0.35",
  "--figment-stage-tint": "#12161f",
};

export type PartialTokens = Partial<FigmentTokens>;

/** Merge overrides onto defaults (or a base theme). */
export function resolveTokens(overrides?: PartialTokens): FigmentTokens {
  return { ...DEFAULT_TOKENS, ...overrides };
}

/** Serialize tokens as a CSS `:root` (or selector) block. */
export function tokensToCss(
  tokens: FigmentTokens = DEFAULT_TOKENS,
  selector = ":root",
): string {
  const body = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/** CSS custom property name for a token key. */
export function tokenVar(name: keyof FigmentTokens): string {
  return `var(${name})`;
}

/**
 * Apply tokens to a DOM element (or documentElement).
 * Works in DOM mode; canvas mode can read the same computed variables.
 */
export function applyTokens(
  el: Element | null,
  tokens: PartialTokens = {},
): FigmentTokens {
  const resolved = resolveTokens(tokens);
  const target =
    el ??
    (typeof document !== "undefined" ? document.documentElement : null);
  if (target && "style" in target) {
    const style = (target as HTMLElement).style;
    for (const [k, v] of Object.entries(resolved)) {
      style.setProperty(k, v);
    }
  }
  return resolved;
}

/** Read a single token from a live element (canvas host included). */
export function getToken(
  el: Element | null,
  name: keyof FigmentTokens,
  fallback: string = DEFAULT_TOKENS[name],
): string {
  const target =
    el ??
    (typeof document !== "undefined" ? document.documentElement : null);
  if (target && typeof getComputedStyle === "function") {
    const v = getComputedStyle(target).getPropertyValue(name).trim();
    if (v) return v;
  }
  return fallback;
}

/** Inject a stylesheet tag with the default/overridden theme. */
export function installTokenStyles(
  doc: Document | undefined,
  tokens: PartialTokens = {},
  id = "figment-tokens",
): HTMLStyleElement | null {
  const d = doc ?? (typeof document !== "undefined" ? document : undefined);
  if (!d) return null;
  let el = d.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = d.createElement("style");
    el.id = id;
    d.head?.append(el);
  }
  el.textContent = tokensToCss(resolveTokens(tokens));
  return el;
}
