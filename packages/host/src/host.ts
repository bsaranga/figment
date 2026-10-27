import {
  EnrollmentError,
  FigmentUnsupportedError,
  PaintTimeoutError,
} from "./errors.js";
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
import { createWebGLBackend, type WebGLBackend } from "./backend/webgl.js";
import { createWebGPUBackend, type WebGPUBackend } from "./backend/webgpu.js";
import { assertSupport } from "./support.js";
import { assertAdmission, type AdmissionReport } from "./admission.js";
import { composeTiltMatrix, tiltToCss, toDOMMatrix, witnessTilt } from "./tilt.js";
import type {
  CreateHostOptions,
  GeometryUpdate,
  Host,
  HostState,
  LayerHandle,
  LayerOpts,
  LayerTransform,
  TransformOrigin,
} from "./types.js";
import type { Vec2 } from "./geometry.js";
import {
  defaultCamera,
  layerCssTransform3D,
  type Camera,
} from "./camera.js";

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
    this.host.refreshLayerCss(this.record);
    this.host.syncLayerGeometry(this.record);
    this.host.requestPaint();
  }

  setOrigin(o: TransformOrigin): void {
    this.record.origin = o;
    this.record.dirty = true;
    this.host.refreshLayerCss(this.record);
    this.host.syncLayerGeometry(this.record);
    this.host.requestPaint();
  }

  setClip(clip: DOMRect | null): void {
    if (clip) this.record.clip = clip;
    else delete this.record.clip;
    this.record.dirty = true;
    this.host.syncLayerGeometry(this.record);
    this.host.requestPaint();
  }

  updateGeometry(g: GeometryUpdate): void {
    if (g.canvasTransform) this.record.canvasTransform = g.canvasTransform;
    if (g.canvasClip === null) delete this.record.clip;
    else if (g.canvasClip) this.record.clip = g.canvasClip;
    if (typeof g.preserveHitTestOrder === "boolean") {
      this.record.preserveHitTestOrder = g.preserveHitTestOrder;
    }
    this.record.dirty = true;
    this.host.syncLayerGeometry(this.record);
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
  /** M2c: covered until the first complete frame, then swap in. */
  private pendingEnable = true;
  private savedPointerEvents = "";
  private pendingCover: HTMLElement | null = null;
  private camera: Camera = defaultCamera();

  private webgl: WebGLBackend | null = null;
  private webgpu: WebGPUBackend | null = null;
  private webgpuReady: Promise<void> | null = null;
  private webgpuInitError: unknown = null;

  constructor(canvas: HTMLCanvasElement, options: CreateHostOptions) {
    this.canvas = canvas;
    this.backend = options.backend;
    this.paintTimeoutMs = options.paintTimeoutMs ?? 2000;

    assertSupport(canvas);
    prepareCanvas(canvas);
    canvas.dataset.figmentHost = "1";

    if (options.backend === "2d") {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new FigmentUnsupportedError("missing-api", "2D context unavailable");
      }
      this.ctx = ctx;
    } else if (options.backend === "webgl") {
      this.webgl = createWebGLBackend(canvas);
      // WebGL replaces the 2D context; keep a dummy for typing.
      this.ctx = canvas.getContext("2d") ?? ({} as CanvasRenderingContext2D);
    } else {
      // WebGPU configure is async — draw waits on webgpuReady.
      this.ctx = canvas.getContext("2d") ?? ({} as CanvasRenderingContext2D);
      this.webgpuReady = createWebGPUBackend(canvas)
        .then((b) => {
          this.webgpu = b;
          this.requestPaint();
        })
        .catch((e) => {
          this.health = "failed";
          this.lastError = e instanceof Error ? e.message : String(e);
          this.webgpuInitError = e;
          // Wake any paintOnce waiters so they can observe the failure.
          const waiting = this.pendingPaintOnce.splice(0);
          for (const fn of waiting) fn();
          throw e;
        });
    }
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
      // CRITICAL: drawElementImage must run inside the paint event
      // (WICG contract — outside throws "No cached paint record" or draws empty).
      this.flushPaint(true);
    };
    canvas.addEventListener("paint", this.paintHandler);
    this.health = "idle";
    this.armSeamlessEnable();
  }

  /**
   * M2c — hide the surface until a complete first frame exists.
   * Cover with a same-box overlay (not opacity:0 — that suppresses
   * drawElementImage capture). Swap only when pixels actually landed.
   */
  private armSeamlessEnable(): void {
    this.pendingEnable = true;
    this.savedPointerEvents = this.canvas.style.pointerEvents;
    this.canvas.dataset.figmentPending = "1";

    const parent = this.canvas.parentElement;
    if (parent && getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    const cover = document.createElement("div");
    cover.setAttribute("data-figment-pending-cover", "1");
    const bg = this.canvas.style.background || "#12161f";
    cover.style.cssText = [
      "position:absolute",
      "inset:0",
      `background:${bg}`,
      "pointer-events:none",
      "z-index:1",
    ].join(";");
    this.pendingCover = cover;
    if (parent) {
      // Overlay the canvas box; canvas stays visible for the capture pipeline.
      const rect = this.canvas.getBoundingClientRect();
      cover.style.left = `${this.canvas.offsetLeft}px`;
      cover.style.top = `${this.canvas.offsetTop}px`;
      cover.style.width = `${rect.width || this.canvas.clientWidth}px`;
      cover.style.height = `${rect.height || this.canvas.clientHeight}px`;
      cover.style.right = "auto";
      cover.style.bottom = "auto";
      parent.append(cover);
    }
    // During probe, drop pointer events on the canvas (Underglass contract).
    this.canvas.style.pointerEvents = "none";
  }

  private revealIfComplete(drawn: number): void {
    if (!this.pendingEnable) return;
    if (drawn <= 0) return;
    if (!this.frameHasPixels()) {
      this.requestBrowserPaint();
      return;
    }
    this.pendingEnable = false;
    this.canvas.style.pointerEvents = this.savedPointerEvents || "auto";
    delete this.canvas.dataset.figmentPending;
    this.pendingCover?.remove();
    this.pendingCover = null;
    this.metrics.seamlessSwaps += 1;
  }

  /** True when at least one opaque pixel landed on the surface. */
  private frameHasPixels(): boolean {
    const { width, height } = this.canvas;
    if (width < 1 || height < 1) return false;
    for (let gy = 1; gy <= 4; gy++) {
      for (let gx = 1; gx <= 4; gx++) {
        const x = Math.floor((width * gx) / 5);
        const y = Math.floor((height * gy) / 5);
        try {
          const { data } = this.ctx.getImageData(x, y, 1, 1);
          if ((data[3] ?? 0) > 0) return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  private cancelSeamlessEnable(): void {
    if (!this.pendingEnable) return;
    this.pendingEnable = false;
    this.canvas.style.pointerEvents = this.savedPointerEvents || "auto";
    delete this.canvas.dataset.figmentPending;
    this.pendingCover?.remove();
    this.pendingCover = null;
  }

  /** Ask the browser for a paint event (draw happens in that handler). */
  private requestBrowserPaint(): void {
    if (this.destroyed) return;
    const req = (this.canvas as HTMLCanvasElement & { requestPaint?: () => void })
      .requestPaint;
    if (typeof req === "function") {
      req.call(this.canvas);
      return;
    }
    // Fallback: draw next frame (may lack a paint-record cache).
    this.requestPaint();
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
    // Pin hit order + clip + tilt/Z CSS to the browser stack before the witness.
    this.refreshLayerCss(record);
    this.syncLayerGeometry(record);
    // One paint so the browser has a paint record + live geometry for hits.
    this.flushPaint(true);

    // M2g: refuse tilt when the browser cannot hit the transformed quad.
    // Witness runs AFTER geometry sync + paint — drawable children need both
    // before elementFromPoint can resolve them.
    if (record.tilt && (record.tilt.x !== 0 || record.tilt.y !== 0)) {
      if (!(el instanceof HTMLElement)) {
        this.removeLayer(record.id);
        throw new FigmentUnsupportedError(
          "tilt-unsupported",
          "tilt requires an HTMLElement target for the admission witness",
        );
      }
      const originX =
        record.origin === "center"
          ? 0.5
          : record.origin === "top-left"
            ? 0
            : typeof record.origin === "object"
              ? record.origin.x
              : 0.5;
      const originY =
        record.origin === "center"
          ? 0.5
          : record.origin === "top-left"
            ? 0
            : typeof record.origin === "object"
              ? record.origin.y
              : 0.5;
      const witness = witnessTilt({
        element: el,
        tilt: record.tilt,
        originX,
        originY,
        syncHits: () => this.syncLayerGeometry(record),
      });
      this.metrics.tiltWitnesses += 1;
      if (!witness.ok) {
        this.metrics.tiltWitnessFailures += 1;
        this.removeLayer(record.id);
        throw new FigmentUnsupportedError(
          "tilt-unsupported",
          `${witness.detail}. Browser cannot hit-test this tilt (see ACTIVATION.md / WICG).`,
        );
      }
    }

    // Draw during the next browser paint event (drawElementImage contract).
    this.requestPaint();
    return new LayerHandleImpl(record.id, el, this, record);
  }

  removeLayer(id: string): void {
    const rec = this.registry.remove(id);
    if (!rec) return;
    this.clearLayerGeometry(rec);
    unmarkDrawable(rec.element);
    restoreNestedMarks(rec.nestedMarks);
    this.registry.markAllDirty();
    this.requestPaint();
  }

  refreshLayerCss(rec: LayerRecord): void {
    if (rec.element instanceof HTMLElement) {
      applyLayerCssTransform(
        rec.element,
        rec,
        this.camera.perspective,
        this.camera.z,
      );
    }
  }

  updateGeometry(id: string, g: GeometryUpdate): void {
    const rec = this.registry.get(id);
    if (!rec) throw new EnrollmentError(`unknown layer "${id}"`);
    if (g.canvasTransform) rec.canvasTransform = g.canvasTransform;
    if (g.canvasClip === null) delete rec.clip;
    else if (g.canvasClip) rec.clip = g.canvasClip;
    if (typeof g.preserveHitTestOrder === "boolean") {
      rec.preserveHitTestOrder = g.preserveHitTestOrder;
    }
    rec.dirty = true;
    this.syncLayerGeometry(rec);
    this.requestPaint();
  }

  clearGeometry(id: string): void {
    const rec = this.registry.get(id);
    if (!rec) return;
    this.clearLayerGeometry(rec);
    this.metrics.geometryClears += 1;
  }

  /**
   * M2d — push canonical geometry to the browser hit stack.
   * `preserveHitTestOrder: true` by default so background redraws do not
   * steal clicks (ACTIVATION.md “last drawn wins” footgun).
   */
  syncLayerGeometry(rec: LayerRecord): void {
    // Keep DOM hit-testing aligned with canvasClip (WICG #186: browser
    // hit for rotated clip is AABB; we also clip-path the element).
    applyElementClipPath(rec);

    const canvas = this.canvas as HTMLCanvasElement & {
      updateElementGeometry?: (
        el: Element,
        init?: {
          canvasTransform?: DOMMatrix;
          canvasClip?: DOMRect;
          preserveHitTestOrder?: boolean;
        },
      ) => void;
    };
    if (typeof canvas.updateElementGeometry !== "function") return;

    const init: {
      canvasTransform?: DOMMatrix;
      canvasClip?: DOMRect;
      preserveHitTestOrder?: boolean;
    } = {
      preserveHitTestOrder: rec.preserveHitTestOrder,
    };
    if (rec.tilt && (rec.tilt.x !== 0 || rec.tilt.y !== 0)) {
      const el = rec.element as HTMLElement;
      const w = el.offsetWidth || el.getBoundingClientRect().width;
      const h = el.offsetHeight || el.getBoundingClientRect().height;
      const originX =
        rec.origin === "center"
          ? 0.5
          : rec.origin === "top-left"
            ? 0
            : rec.origin.x;
      const originY =
        rec.origin === "center"
          ? 0.5
          : rec.origin === "top-left"
            ? 0
            : rec.origin.y;
      const pm = composeTiltMatrix({
        tilt: rec.tilt,
        width: w,
        height: h,
        originX,
        originY,
      });
      init.canvasTransform = toDOMMatrix(pm.matrix);
    } else if (rec.canvasTransform) {
      init.canvasTransform = rec.canvasTransform;
    }
    // canvasClip is applied via draw clip + element clip-path (DOM hits).
    // Passing canvasClip here can blank the hit region (WICG #186 family).
    // if (rec.clip) init.canvasClip = rec.clip;

    try {
      canvas.updateElementGeometry(rec.element, init);
      this.metrics.geometryUpdates += 1;
    } catch (e) {
      this.health = "failed";
      this.lastError = e instanceof Error ? e.message : String(e);
    }
  }

  private clearLayerGeometry(rec: LayerRecord): void {
    const canvas = this.canvas as HTMLCanvasElement & {
      clearElementGeometry?: (el: Element) => void;
    };
    if (typeof canvas.clearElementGeometry !== "function") return;
    try {
      canvas.clearElementGeometry(rec.element);
      this.metrics.geometryClears += 1;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
    }
  }

  requestPaint(): void {
    if (this.destroyed) return;
    // Prefer the browser paint event so drawElementImage has a paint record.
    const req = (this.canvas as HTMLCanvasElement & { requestPaint?: () => void })
      .requestPaint;
    if (typeof req === "function") {
      req.call(this.canvas);
      return;
    }
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

  setCamera(c: Camera): void {
    this.camera = { ...c };
    this.registry.markAllDirty();
    for (const layer of this.registry.all()) {
      applyElementTilt(layer, this.camera.perspective, this.camera.z);
      this.syncLayerGeometry(layer);
    }
    this.requestPaint();
  }

  getCamera(): Camera {
    return { ...this.camera };
  }

  paintOnce(): Promise<void> {
    return new Promise((resolve, reject) => {
      const run = () => this.schedulePaintOnce(resolve, reject);
      if (this.backend === "webgpu" && this.webgpuReady && !this.webgpu) {
        this.webgpuReady.then(run).catch((e) => reject(e));
        return;
      }
      run();
    });
  }

  private schedulePaintOnce(
    resolve: () => void,
    reject: (e: unknown) => void,
  ): void {
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
      if (this.backend === "webgpu" && !this.webgpu) {
        if (this.webgpuInitError) {
          this.health = "failed";
          this.lastError =
            this.webgpuInitError instanceof Error
              ? this.webgpuInitError.message
              : String(this.webgpuInitError);
          const waiting = this.pendingPaintOnce.splice(0);
          for (const fn of waiting) fn();
          return;
        }
        // Still configuring — try again once ready.
        this.webgpuReady?.then(() => this.requestPaint()).catch(() => {});
        return;
      }
      if (this.backend === "2d" && this.ctx.reset) this.ctx.reset();
      const scene = {
        cssSize: this.unitState.cssSize,
        unitScale: this.unitState.scale,
        camera: this.camera,
      };
      let drawn = 0;
      if (this.webgl) {
        drawn = this.webgl.draw(layers, scene);
      } else if (this.webgpu) {
        drawn = this.webgpu.draw(layers, scene);
      } else {
        drawn = drawLayers2D({
          ctx: this.ctx,
          layers,
          cssSize: this.unitState.cssSize,
          unitScale: this.unitState.scale,
          camera: this.camera,
          onlyDirty: false,
        });
      }
      this.metrics.paints += 1;
      this.metrics.layersDrawn += drawn;
      this.metrics.dirtyRedraws += dirty.length;
      this.health = "healthy";
      this.lastError = undefined;
      // M2d: keep hit order stable after redraws (preserveHitTestOrder).
      for (const layer of layers) this.syncLayerGeometry(layer);
      // M2c: only swap when a complete frame (≥1 layer) actually landed.
      this.revealIfComplete(drawn);
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
      pendingEnable: this.pendingEnable,
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
    this.webgl?.dispose();
    this.webgl = null;
    this.webgpu?.dispose();
    this.webgpu = null;
    if (this.paintHandler) {
      this.canvas.removeEventListener("paint", this.paintHandler);
      this.paintHandler = null;
    }
    this.cancelSeamlessEnable();
    this.canvas.removeAttribute("content");
    delete this.canvas.dataset.figmentHost;
    this.health = "idle";
    const waiters = this.pendingPaintOnce.splice(0);
    for (const fn of waiters) fn();
  }
}

/**
 * Map a CSS-px clip rect (canvas space) onto the element as clip-path so
 * DOM hit-testing matches what we draw under canvasClip.
 */
function applyElementTilt(
  rec: LayerRecord,
  perspective = 1200,
  cameraZ = 0,
): void {
  const el = rec.element;
  if (!(el instanceof HTMLElement)) return;
  applyLayerCssTransform(el, rec, perspective, cameraZ);
}

function applyLayerCssTransform(
  el: HTMLElement,
  rec: LayerRecord,
  perspective = 1200,
  cameraZ = 0,
): void {
  el.style.transformOrigin = cssOriginKeyword(rec.origin);

  const hasTilt = !!rec.tilt && (rec.tilt.x !== 0 || rec.tilt.y !== 0);
  const hasZ = rec.transform.z !== 0;
  const hasRot =
    rec.transform.rotation !== 0 ||
    rec.transform.scaleX !== 1 ||
    rec.transform.scaleY !== 1 ||
    rec.transform.rotateX !== 0 ||
    rec.transform.rotateY !== 0;

  if (!hasTilt && !hasZ && !hasRot) {
    if (el.dataset.figmentTilt === "1" || el.dataset.figmentZ === "1") {
      el.style.transform = "";
      el.style.perspective = "";
      delete el.dataset.figmentTilt;
      delete el.dataset.figmentZ;
    }
    return;
  }

  if (hasTilt && rec.tilt) {
    const originX =
      rec.origin === "center" ? 0.5 : rec.origin === "top-left" ? 0 : rec.origin.x;
    const originY =
      rec.origin === "center" ? 0.5 : rec.origin === "top-left" ? 0 : rec.origin.y;
    el.style.transform = tiltToCss(rec.tilt, originX, originY);
    el.dataset.figmentTilt = "1";
    return;
  }

  // M2j: scene-space translate3d (parent/canvas supplies perspective via camera).
  el.style.transform = layerCssTransform3D({
    x: rec.transform.x,
    y: rec.transform.y,
    z: rec.transform.z,
    scaleX: rec.transform.scaleX,
    scaleY: rec.transform.scaleY,
    rotation: rec.transform.rotation,
    rotateX: rec.transform.rotateX,
    rotateY: rec.transform.rotateY,
    opacity: rec.transform.opacity,
    perspective,
    cameraZ,
  });
  el.dataset.figmentZ = "1";
}

function cssOriginKeyword(origin: TransformOrigin): string {
  if (origin === "top-left") return "top left";
  if (origin === "center") return "center";
  return `${(origin.x * 100).toFixed(4)}% ${(origin.y * 100).toFixed(4)}%`;
}

function applyElementClipPath(rec: LayerRecord): void {
  const el = rec.element;
  if (!(el instanceof HTMLElement)) return;

  // M2e: keep DOM hit-testing on the same pivot as the GPU draw.
  el.style.transformOrigin = cssOriginKeyword(rec.origin);
  // M2f: projective tilt as CSS perspective+rotate (hits follow the quad).
  applyElementTilt(rec);

  if (!rec.clip) {
    el.style.clipPath = "";
    return;
  }

  // Layer draws at drawAt (canvas-grid → CSS via unit). Default origin 0,0.
  // Clip rect is in the same CSS space as the canvas content box.
  const drawCssX = rec.drawAt ? rec.drawAt.x : rec.transform.x;
  const drawCssY = rec.drawAt ? rec.drawAt.y : rec.transform.y;
  const box = el.getBoundingClientRect();
  const width = box.width || el.offsetWidth;
  const height = box.height || el.offsetHeight;
  if (width <= 0 || height <= 0) return;

  const localLeft = rec.clip.x - drawCssX;
  const localTop = rec.clip.y - drawCssY;
  const localRight = localLeft + rec.clip.width;
  const localBottom = localTop + rec.clip.height;

  const insetTop = Math.max(0, localTop);
  const insetLeft = Math.max(0, localLeft);
  const insetRight = Math.max(0, width - localRight);
  const insetBottom = Math.max(0, height - localBottom);

  el.style.clipPath = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
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
