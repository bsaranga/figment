/**
 * M3k — interaction contracts (safety).
 * decorative | inert | material — enforced at setEffect/setMaterial
 * and re-checked on mutation. Violations throw; no silent fallback.
 */
import { FigmentUnsupportedError } from "@figment/host";

export type InteractionMode = "decorative" | "inert" | "material";

export interface ContentFlags {
  /** Element is aria-hidden or explicitly non-interactive. */
  inertOrAriaHidden?: boolean;
  /** Element contains live form controls / focusable chrome. */
  hasLiveControls?: boolean;
  /** Element currently has `inert` applied (inert mode during effect). */
  currentlyInert?: boolean;
}

export type Operation = "effect" | "material" | "light";

export interface ContractRule {
  mode: InteractionMode;
  /** Content requirement. */
  requireInert: boolean;
  allowLiveControls: boolean;
  mayMovePixels: boolean;
  mayRelight: boolean;
}

export const CONTRACTS: Record<InteractionMode, ContractRule> = {
  decorative: {
    mode: "decorative",
    requireInert: true,
    allowLiveControls: false,
    mayMovePixels: true,
    mayRelight: true,
  },
  inert: {
    mode: "inert",
    requireInert: true, // held inert while effect runs
    allowLiveControls: true, // content may be interactive outside the effect
    mayMovePixels: true,
    mayRelight: true,
  },
  material: {
    mode: "material",
    requireInert: false,
    allowLiveControls: true,
    mayMovePixels: false,
    mayRelight: true,
  },
};

function fail(msg: string): never {
  throw new FigmentUnsupportedError("probe-failed", `interaction contract: ${msg}`);
}

/** Does this operation move pixels? (effects, glass refraction, etc.) */
export function operationMovesPixels(op: Operation, kind?: string): boolean {
  if (op === "light") return false;
  if (op === "material") {
    // relief/stage/glass: glass refracts UV (pixel-moving); relief/stage do not.
    return kind === "glass";
  }
  // effects chain always samples/moves pixels
  return true;
}

/**
 * Validate mode + content + operation. Throws on violation.
 * `pixelMoving` overrides the default classification when needed.
 */
export function assertContract(opts: {
  mode: InteractionMode;
  content: ContentFlags;
  operation: Operation;
  kind?: string;
  pixelMoving?: boolean;
}): void {
  const rule = CONTRACTS[opts.mode];
  if (!rule) fail(`unknown mode "${opts.mode}"`);

  const moves =
    opts.pixelMoving ?? operationMovesPixels(opts.operation, opts.kind);

  if (moves && !rule.mayMovePixels) {
    fail(
      `mode "${opts.mode}" forbids pixel-moving ${opts.operation}${opts.kind ? ` (${opts.kind})` : ""} — use relief/relight or switch to decorative`,
    );
  }

  if (opts.operation === "light" && !rule.mayRelight) {
    fail(`mode "${opts.mode}" forbids relight`);
  }

  if (rule.requireInert) {
    const ok =
      opts.content.inertOrAriaHidden === true ||
      opts.content.currentlyInert === true;
    if (!ok) {
      fail(
        `mode "${opts.mode}" requires inert/aria-hidden content (or inert during the effect)`,
      );
    }
    if (opts.mode === "decorative" && opts.content.hasLiveControls) {
      fail(`mode "decorative" cannot host live controls`);
    }
  }

  if (!rule.allowLiveControls && opts.content.hasLiveControls) {
    fail(`mode "${opts.mode}" cannot host live controls`);
  }
}

/** Flip an element inert for `inert` mode effects (and restore). */
export function withInert<T>(
  el: HTMLElement,
  fn: () => T,
): T {
  const prev = el.getAttribute("inert");
  const prevAria = el.getAttribute("aria-hidden");
  el.setAttribute("inert", "");
  try {
    return fn();
  } finally {
    if (prev === null) el.removeAttribute("inert");
    else el.setAttribute("inert", prev);
    if (prevAria === null) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", prevAria);
  }
}

/**
 * Re-check after mutation (Underglass: re-checked on mutation).
 * Throws when live controls appear under a pixel-moving effect in material mode.
 */
export function recheckContract(opts: {
  mode: InteractionMode;
  content: ContentFlags;
  operation: Operation;
  kind?: string;
}): void {
  assertContract(opts);
}

const modes = new Map<string, InteractionMode>();

export function setInteractionMode(
  layerId: string,
  mode: InteractionMode,
): void {
  if (!CONTRACTS[mode]) fail(`unknown mode "${mode}"`);
  modes.set(layerId, mode);
}

export function getInteractionMode(layerId: string): InteractionMode {
  return modes.get(layerId) ?? "material";
}

export function clearInteractionModes(): void {
  modes.clear();
}
