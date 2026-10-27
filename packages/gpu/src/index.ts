/**
 * figment GPU framework — public entry (stub).
 * See ARCHITECTURE.md §4 and PLAN.md M3.
 */

export type EffectDesc =
  | { kind: "ripple"; amplitude: number; edge?: number }
  | { kind: "chromatic"; offset: number }
  | { kind: "dissolve"; progress: number }
  | { kind: "custom"; id: string; params: Record<string, number> };

export type MaterialDesc =
  | { kind: "relief"; bevel?: number; depth?: number }
  | { kind: "stage" }
  | {
      kind: "glass";
      ior?: number;
      tint?: string;
      dispersion?: number;
    };

/** Safety contract for effects vs live controls. */
export type InteractionMode = "decorative" | "inert" | "material";

export const GPU_VERSION = "0.0.0";
