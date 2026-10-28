import { DEFAULT_TRANSFORM } from "./types.js";
import { composeAffine } from "./geometry.js";
import { EnrollmentError } from "./errors.js";
export function resolveOrigin(origin, size) {
    if (origin === "top-left")
        return { x: 0, y: 0 };
    if (origin === "center")
        return { x: size.x / 2, y: size.y / 2 };
    return { x: origin.x * size.x, y: origin.y * size.y };
}
export function layerAffine(record, cssSize, unitScale) {
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
    map = new Map();
    seq = 0;
    budget;
    constructor(budget = 32) {
        this.budget = budget;
    }
    get size() {
        return this.map.size;
    }
    add(element, opts = {}) {
        if (this.map.size >= this.budget) {
            throw new EnrollmentError(`layer budget exceeded (${this.budget}). Increase budgets.layers.`);
        }
        if (this.findByElement(element)) {
            throw new EnrollmentError("element already enrolled as a layer");
        }
        const id = opts.id ?? `layer-${++this.seq}`;
        if (this.map.has(id)) {
            throw new EnrollmentError(`duplicate layer id "${id}"`);
        }
        const record = {
            id,
            element,
            transform: { ...DEFAULT_TRANSFORM, ...opts.transform },
            origin: opts.origin ?? "top-left",
            decorative: opts.decorative ?? false,
            dirty: true,
            preserveHitTestOrder: opts.preserveHitTestOrder ?? true,
            nestedMarks: [],
        };
        if (opts.clip)
            record.clip = opts.clip;
        if (opts.drawAt)
            record.drawAt = opts.drawAt;
        if (opts.tilt)
            record.tilt = opts.tilt;
        this.map.set(id, record);
        return record;
    }
    get(id) {
        return this.map.get(id);
    }
    findByElement(el) {
        for (const rec of this.map.values()) {
            if (rec.element === el || rec.element.contains(el) || el.contains(rec.element)) {
                return rec;
            }
        }
        return undefined;
    }
    findForTarget(node) {
        const el = node instanceof Element
            ? node
            : node.parentElement ?? node.parentNode;
        if (!el)
            return undefined;
        return (this.findByElement(el) ??
            (el.closest?.("[data-figment-layer]")
                ? undefined
                : undefined));
    }
    all() {
        // Enrollment order = hit-test stack order (bottom → top).
        return [...this.map.values()];
    }
    /** Layers topmost-first for hit resolution. */
    hitStack() {
        return this.all().reverse();
    }
    dirtyAll() {
        return this.all().filter((r) => r.dirty);
    }
    markAllDirty() {
        for (const r of this.map.values())
            r.dirty = true;
    }
    remove(id) {
        const rec = this.map.get(id);
        if (rec)
            this.map.delete(id);
        return rec;
    }
    clear() {
        this.map.clear();
    }
}
//# sourceMappingURL=layers.js.map