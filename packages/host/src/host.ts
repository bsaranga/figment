import {
  EnrollmentError,
  FigmentUnsupportedError,
  PaintTimeoutError,
} from "./errors.js";
import { assertSupport } from "./support.js";
import {
  markDrawable,
  markNestedCanvases,
  prepareCanvas,
  restoreNestedMarks,
  unmarkDrawable,
  type NestedMark,
} from "./canvas-setup.js";
import {
  attachInputCaptures,
  createMutationBridge,
  type MutationBridge,
} from "./mutations.js";
import { attachUnits, type UnitBridge, type UnitState } from "./units.js";
import { LayerRegistry, type LayerRecord } from "./layers.js";
import { buildState, createMetrics, type Metrics } from "./diagnostics.js";
import { drawLayers2D } from "./backend/2d.js";
import { assertAdmission, type AdmissionReport } from "./admission.js";
import type {
  CreateHostOptions,
  Host,
  HostState,
  LayerHandle,
  LayerOpts,
  LayerTransform,
  TransformOrigin,
} from "./types.js";
import type { Vec2 } from "./geometry.js";

class LayerHandleImpl implements LayerHandle {
  constructor(
    readonly id: string,
    readonly element: Element,
    private readonly host: HostImpl,
    private readonly record: LayerRecord,
  ) {}

  setTransform(t: Partial<LayerTransform>): void {
    Object.assign(this.record.transform, t);
    this.record.dirty = true;
    this.host.requestPaint();
  }

  setOrigin(o: TransformOrigin): void {
    this.record.origin = o;
    this.record.dirty = true;
    this.host.requestPaint();
  }

  invalidate(): void {
    this.record.dirty = true;
    this.host.requestPaint();
  }

  dispose(): void {
    this.host.removeLayer(this.id);
  }
}

class HostImpl implements Host {
  readonly backend: CreateHostOptions["backend"];
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly registry: LayerRegistry;
  private readonly metrics: Metrics = createMetrics();
  private readonly paintTimeoutMs: number;
  private readonly globalNestedMarks: NestedMark[] = [];

  private units: UnitBridge;
  private unitState: UnitState;
  private mutations: MutationBridge | null = null;
  private detachInputs: (() => void) | null = null;
  private paintHandler: ((ev: Event) => void) | null = null;
  private raf = 0;
  private destroyed = false;
  private health: HostState["health"] = "idle";
  private lastError: string | undefined;
  private pendingPaintOnce: (() => void)[] = [];
  private mountRoot: ParentNode | null = null;
  private admission: AdmissionReport | null = null;

  constructor(canvas: HTMLCanvasElement, options: CreateHostOptions) {
    if (options.backend !== "2d") {
      throw new FigmentUnsupportedError(
        "missing-api",
        `backend "${options.backend}" ships in M2. Use "2d" for M1.`,
      );
    }
    this.canvas = canvas;
    this.backend = options.backend;
    this.paintTimeoutMs = options.paintTimeoutMs ?? 2000;

    assertSupport(canvas);
    prepareCanvas(canvas);
    canvas.dataset.figmentHost = "1";

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new FigmentUnsupportedError("missing-api", "2D context unavailable");
    }
    this.ctx = ctx;
    this.registry = new LayerRegistry(options.budgets?.layers ?? 32);

    this.units = attachUnits(canvas, (u) => {
      this.unitState = u;
      this.registry.markAllDirty();
      this.requestPaint();
    });
    this.unitState = this.units.state();

    this.paintHandler = (ev: Event) => {
      const changed = (ev as Event & { changedElements?: Element[] }).changedElements;
      if (changed && changed.length > 0) {
        for (const el of changed) {
          const rec = this.registry.findByElement(el) ?? this.registry.findForTarget(el);
          if (rec) rec.dirty = true;
          else this.registry.markAllDirty();
        }
      } else {
        this.registry.markAllDirty();
      }
      this.requestPaint();
    };
    canvas.addEventListener("paint", this.paintHandler);
    this.health = "idle";
  }

  mount(root: ParentNode): () => void {
    if (this.mountRoot) {
      throw new EnrollmentError("host already mounted");
    }
    this.mountRoot = root;
    this.globalNestedMarks.push(...markNestedCanvases(root));

    this.mutations = createMutationBridge(root, (target) => {
      const rec = this.registry.findForTarget(target) ?? this.registry.findByElement(target as Element);
      if (rec) {
        rec.dirty = true;
      } else {
        // mutation outside a known layer — dirty all enrolled layers under root
        for (const layer of this.registry.all()) {
          if (root.contains(layer.element) || layer.element.contains(target as Node)) {
            layer.dirty = true;
          }
        }
      }
      this.metrics.mutationsIgnored = this.mutations?.stats.ignored ?? 0;
      this.requestPaint();
    });

    this.detachInputs = attachInputCaptures(root, (target) => {
      const rec = this.registry.findForTarget(target) ?? this.registry.findByElement(target as Element);
      if (rec) rec.dirty = true;
      this.requestPaint();
    }, this.metrics);

    return () => this.unmount();
  }

  private unmount(): void {
    this.mutations?.stop();
    this.mutations = null;
    this.detachInputs?.();
    this.detachInputs = null;
    restoreNestedMarks(this.globalNestedMarks.splice(0));
    this.mountRoot = null;
    this.registry.markAllDirty();
    this.requestPaint();
  }

  async admit(): Promise<AdmissionReport> {
    if (this.destroyed) throw new EnrollmentError("host destroyed");
    this.health = "pending";
    try {
      const report = await assertAdmission();
      this.admission = report;
      this.health = "healthy";
      this.lastError = undefined;
      return report;
    } catch (e) {
      this.health = "failed";
      this.lastError = e instanceof Error ? e.message : String(e);
      // Keep any partial proof we already recorded via runAdmission path.
      throw e;
    }
  }

  layer(el: Element, opts: LayerOpts = {}): LayerHandle {
    if (this.destroyed) throw new EnrollmentError("host destroyed");
    const record = this.registry.add(el, opts);
    markDrawable(el);
    if (this.mountRoot) {
      record.nestedMarks = markNestedCanvases(el);
      this.metrics.nestedCanvasMarks += record.nestedMarks.length;
    }
    // Draw immediately so geometry/hit-test is valid before the next frame.
    this.flushPaint(true);
    this.requestPaint();
    return new LayerHandleImpl(record.id, el, this, record);
  }

  removeLayer(id: string): void {
    const rec = this.registry.remove(id);
    if (!rec) return;
    unmarkDrawable(rec.element);
    restoreNestedMarks(rec.nestedMarks);
    this.registry.markAllDirty();
    this.requestPaint();
  }

  requestPaint(): void {
    if (this.destroyed) return;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.flushPaint(false);
    });
  }

  invalidate(layer?: LayerHandle): void {
    if (layer) {
      const rec = this.registry.get(layer.id);
      if (rec) rec.dirty = true;
    } else {
      this.registry.markAllDirty();
    }
    this.requestPaint();
  }

  paintOnce(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingPaintOnce = this.pendingPaintOnce.filter((fn) => fn !== done);
        reject(new PaintTimeoutError(`paintOnce timed out after ${this.paintTimeoutMs}ms`));
      }, this.paintTimeoutMs);

      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      this.pendingPaintOnce.push(done);
      this.registry.markAllDirty();
      this.requestPaint();
    });
  }

  private flushPaint(force: boolean): void {
    if (this.destroyed) return;
    const layers = this.registry.all();
    const dirty = layers.filter((l) => l.dirty);
    if (!force && dirty.length === 0) {
      this.metrics.skippedFrames += 1;
      // still resolve paintOnce waiters after a skipped frame if they asked for full paint
      if (this.pendingPaintOnce.length) {
        // force a real draw for paintOnce
        this.flushPaint(true);
        return;
      }
      return;
    }

    try {
      this.ctx.reset();
      const drawn = drawLayers2D({
        ctx: this.ctx,
        layers,
        cssSize: this.unitState.cssSize,
        unitScale: this.unitState.scale,
        onlyDirty: false,
      });
      this.metrics.paints += 1;
      this.metrics.layersDrawn += drawn;
      this.metrics.dirtyRedraws += dirty.length;
      this.health = "healthy";
      this.lastError = undefined;
    } catch (e) {
      this.health = "failed";
      this.lastError = e instanceof Error ? e.message : String(e);
    }

    const waiters = this.pendingPaintOnce.splice(0);
    for (const fn of waiters) fn();
  }

  cssToCanvas(n: number, axis: "x" | "y" = "x"): number {
    return n * this.unitState.scale[axis];
  }

  canvasToCss(n: number, axis: "x" | "y" = "x"): number {
    const s = this.unitState.scale[axis];
    return s === 0 ? n : n / s;
  }

  clientToCanvas(p: Vec2): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (p.x - rect.left) * this.unitState.scale.x,
      y: (p.y - rect.top) * this.unitState.scale.y,
    };
  }

  state(): HostState {
    return buildState({
      backend: this.backend,
      health: this.health,
      supported: true,
      canvasGrid: this.unitState.canvasGrid,
      cssSize: this.unitState.cssSize,
      unitScale: this.unitState.scale,
      layers: this.registry.all().map((l) => ({ id: l.id, dirty: l.dirty })),
      admission: this.admission,
      metrics: {
        ...this.metrics,
        mutationsIgnored: this.mutations?.stats.ignored ?? this.metrics.mutationsIgnored,
      },
      ...(this.lastError !== undefined ? { lastError: this.lastError } : {}),
    });
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unmount();
    for (const layer of this.registry.all()) {
      unmarkDrawable(layer.element);
      restoreNestedMarks(layer.nestedMarks);
    }
    this.registry.clear();
    this.units.stop();
    if (this.paintHandler) {
      this.canvas.removeEventListener("paint", this.paintHandler);
      this.paintHandler = null;
    }
    this.canvas.removeAttribute("content");
    delete this.canvas.dataset.figmentHost;
    this.health = "idle";
    const waiters = this.pendingPaintOnce.splice(0);
    for (const fn of waiters) fn();
  }
}

export function createHost(
  target: HTMLCanvasElement | OffscreenCanvas,
  options: CreateHostOptions,
): Host {
  if (!(target instanceof HTMLCanvasElement)) {
    throw new FigmentUnsupportedError(
      "missing-api",
      "M1 createHost requires an HTMLCanvasElement (OffscreenCanvas in a later milestone).",
    );
  }
  return new HostImpl(target, options);
}
