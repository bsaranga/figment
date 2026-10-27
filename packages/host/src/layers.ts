import type { LayerOpts, LayerTransform, TransformOrigin } from "./types.js";
import { DEFAULT_TRANSFORM } from "./types.js";
import type { Affine, Vec2 } from "./geometry.js";
import { composeAffine } from "./geometry.js";
import { EnrollmentError } from "./errors.js";

export interface LayerRecord {
  id: string;
  element: Element;
  transform: LayerTransform;
  origin: TransformOrigin;
  clip?: DOMRect;
  decorative: boolean;
  drawAt?: { x: number; y: number };
  dirty: boolean;
  /** Nest canvas marks owned while this layer is active. */
  nestedMarks: { canvas: HTMLCanvasElement; previous: string | null }[];
}

export function resolveOrigin(origin: TransformOrigin, size: Vec2): Vec2 {
  if (origin === "top-left") return { x: 0, y: 0 };
  if (origin === "center") return { x: size.x / 2, y: size.y / 2 };
  return { x: origin.x * size.x, y: origin.y * size.y };
}

export function layerAffine(
  record: LayerRecord,
  cssSize: Vec2,
  unitScale: Vec2,
): Affine {
  // Transform is authored in CSS px; compose in CSS space then scale to canvas grid.
  const originCss = resolveOrigin(record.origin, cssSize);
  const css = composeAffine(record.transform, originCss);
  // canvas = S * css  (scale units)
  return {
    a: css.a * unitScale.x,
    b: css.b * unitScale.y,
    c: css.c * unitScale.x,
    d: css.d * unitScale.y,
    e: css.e * unitScale.x,
    f: css.f * unitScale.y,
  };
}

export class LayerRegistry {
  private map = new Map<string, LayerRecord>();
  private seq = 0;
  readonly budget: number;

  constructor(budget = 32) {
    this.budget = budget;
  }

  get size(): number {
    return this.map.size;
  }

  add(element: Element, opts: LayerOpts = {}): LayerRecord {
    if (this.map.size >= this.budget) {
      throw new EnrollmentError(
        `layer budget exceeded (${this.budget}). Increase budgets.layers.`,
      );
    }
    if (this.findByElement(element)) {
      throw new EnrollmentError("element already enrolled as a layer");
    }
    const id = opts.id ?? `layer-${++this.seq}`;
    if (this.map.has(id)) {
      throw new EnrollmentError(`duplicate layer id "${id}"`);
    }
    const record: LayerRecord = {
      id,
      element,
      transform: { ...DEFAULT_TRANSFORM, ...opts.transform },
      origin: opts.origin ?? "top-left",
      decorative: opts.decorative ?? false,
      dirty: true,
      nestedMarks: [],
    };
    if (opts.clip) record.clip = opts.clip;
    if (opts.drawAt) record.drawAt = opts.drawAt;
    if (opts.tilt && (opts.tilt.x !== 0 || opts.tilt.y !== 0)) {
      // M2 implements projective tilt; refuse now (no silent flat fallback).
      throw new EnrollmentError(
        "tilt requires M2 admission (tilt-unsupported). Use transform.rotation for 2D rotation.",
      );
    }
    this.map.set(id, record);
    return record;
  }

  get(id: string): LayerRecord | undefined {
    return this.map.get(id);
  }

  findByElement(el: Element): LayerRecord | undefined {
    for (const rec of this.map.values()) {
      if (rec.element === el || rec.element.contains(el) || el.contains(rec.element)) {
        return rec;
      }
    }
    return undefined;
  }

  findForTarget(node: Node): LayerRecord | undefined {
    const el =
      node instanceof Element
        ? node
        : node.parentElement ?? (node.parentNode as Element | null);
    if (!el) return undefined;
    return (
      this.findByElement(el) ??
      (el.closest?.("[data-figment-layer]") as Element | null
        ? undefined
        : undefined)
    );
  }

  all(): LayerRecord[] {
    return [...this.map.values()];
  }

  dirtyAll(): LayerRecord[] {
    return this.all().filter((r) => r.dirty);
  }

  markAllDirty(): void {
    for (const r of this.map.values()) r.dirty = true;
  }

  remove(id: string): LayerRecord | undefined {
    const rec = this.map.get(id);
    if (rec) this.map.delete(id);
    return rec;
  }

  clear(): void {
    this.map.clear();
  }
}
