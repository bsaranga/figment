/**
 * M4c — `<figment-infinite-canvas>`.
 * Pan / zoom world space. Slotted panels live in world coordinates;
 * the viewport transform is applied on an inner `.world` layer.
 * Native pointer/wheel events (Figma/Miro-class board).
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface CanvasView {
  /** World translation (px). */
  x: number;
  y: number;
  /** Scale factor (1 = 100%). */
  scale: number;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
    overflow: hidden;
    background:
      radial-gradient(circle at 1px 1px, rgba(148,163,204,0.14) 1px, transparent 0)
      0 0 / 24px 24px,
      var(--figment-color-bg, ${DEFAULT_TOKENS["--figment-color-bg"]});
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  :host([data-panning="true"]) {
    cursor: grabbing;
  }
  .world {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  ::slotted(*) {
    position: absolute;
    left: 0;
    top: 0;
  }
</style>
<div class="world" part="world">
  <slot></slot>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentInfiniteCanvas extends BaseElement {
  static readonly observedAttributes = ["scale", "view-x", "view-y"] as const;

  #root: ShadowRoot;
  #view: CanvasView = { x: 0, y: 0, scale: 1 };
  #pan: { id: number; x: number; y: number } | null = null;
  #syncing = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    this.#view = {
      x: num(this.getAttribute("view-x"), 0),
      y: num(this.getAttribute("view-y"), 0),
      scale: num(this.getAttribute("scale"), 1),
    };
    this.#apply();
    this.addEventListener("pointerdown", this.#onDown);
    this.addEventListener("pointermove", this.#onMove);
    this.addEventListener("pointerup", this.#onUp);
    this.addEventListener("pointercancel", this.#onUp);
    this.addEventListener("wheel", this.#onWheel, { passive: false });
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this.#onDown);
    this.removeEventListener("pointermove", this.#onMove);
    this.removeEventListener("pointerup", this.#onUp);
    this.removeEventListener("pointercancel", this.#onUp);
    this.removeEventListener("wheel", this.#onWheel);
    this.#pan = null;
  }

  attributeChangedCallback(): void {
    if (!this.isConnected || this.#syncing) return;
    this.#view = {
      x: num(this.getAttribute("view-x"), this.#view.x),
      y: num(this.getAttribute("view-y"), this.#view.y),
      scale: num(this.getAttribute("scale"), this.#view.scale),
    };
    this.#apply();
  }

  get view(): CanvasView {
    return { ...this.#view };
  }

  set view(v: Partial<CanvasView>) {
    this.#view = {
      x: v.x ?? this.#view.x,
      y: v.y ?? this.#view.y,
      scale: clampScale(v.scale ?? this.#view.scale),
    };
    this.#apply();
    this.#emit();
  }

  /** Convert viewport (client) point → world coordinates. */
  clientToWorld(cx: number, cy: number): { x: number; y: number } {
    const r = this.getBoundingClientRect();
    return {
      x: (cx - r.left - this.#view.x) / this.#view.scale,
      y: (cy - r.top - this.#view.y) / this.#view.scale,
    };
  }

  /** Zoom about a viewport point (keeps that world point under the cursor). */
  zoomAt(clientX: number, clientY: number, nextScale: number): void {
    const s0 = this.#view.scale;
    const s1 = clampScale(nextScale);
    if (s1 === s0) return;
    const r = this.getBoundingClientRect();
    const ox = clientX - r.left;
    const oy = clientY - r.top;
    const wx = (ox - this.#view.x) / s0;
    const wy = (oy - this.#view.y) / s0;
    this.#view = {
      x: ox - wx * s1,
      y: oy - wy * s1,
      scale: s1,
    };
    this.#apply();
    this.#emit();
  }

  /** Fit a world rect into the viewport (for demos / reset). */
  fitWorld(
    rect: { x: number; y: number; width: number; height: number },
    padding = 24,
  ): void {
    const r = this.getBoundingClientRect();
    const w = Math.max(1, r.width - padding * 2);
    const h = Math.max(1, r.height - padding * 2);
    const scale = clampScale(Math.min(w / rect.width, h / rect.height));
    this.#view = {
      x: padding - rect.x * scale + (w - rect.width * scale) / 2,
      y: padding - rect.y * scale + (h - rect.height * scale) / 2,
      scale,
    };
    this.#apply();
    this.#emit();
  }

  #apply(): void {
    const world = this.#root.querySelector(".world") as HTMLElement | null;
    if (!world) return;
    world.style.transform = `translate(${this.#view.x}px, ${this.#view.y}px) scale(${this.#view.scale})`;
    this.#syncing = true;
    try {
      this.setAttribute("scale", String(this.#view.scale));
      this.setAttribute("view-x", String(this.#view.x));
      this.setAttribute("view-y", String(this.#view.y));
    } finally {
      this.#syncing = false;
    }
  }

  #emit(): void {
    this.dispatchEvent(
      new CustomEvent("figment-view", {
        detail: this.view,
        bubbles: true,
      }),
    );
  }

  #onDown = (e: Event): void => {
    const pe = e as PointerEvent;
    // Only pan on background / middle button; panels keep their own drag.
    if (pe.button !== 0 && pe.button !== 1) return;
    const target = pe.composedPath()[0];
    if (target !== this && (target as HTMLElement)?.closest?.("figment-spatial-panel,button,input,a,[data-no-pan]")) {
      return;
    }
    this.#pan = { id: pe.pointerId, x: pe.clientX, y: pe.clientY };
    this.dataset.panning = "true";
    this.setPointerCapture?.(pe.pointerId);
  };

  #onMove = (e: Event): void => {
    if (!this.#pan) return;
    const pe = e as PointerEvent;
    if (pe.pointerId !== this.#pan.id) return;
    const dx = pe.clientX - this.#pan.x;
    const dy = pe.clientY - this.#pan.y;
    this.#pan.x = pe.clientX;
    this.#pan.y = pe.clientY;
    this.#view = {
      x: this.#view.x + dx,
      y: this.#view.y + dy,
      scale: this.#view.scale,
    };
    this.#apply();
    this.#emit();
  };

  #onUp = (e: Event): void => {
    const pe = e as PointerEvent;
    if (this.#pan && pe.pointerId === this.#pan.id) {
      this.#pan = null;
      delete this.dataset.panning;
    }
  };

  #onWheel = (e: Event): void => {
    const we = e as WheelEvent;
    we.preventDefault();
    const factor = we.deltaY < 0 ? 1.08 : 1 / 1.08;
    this.zoomAt(we.clientX, we.clientY, this.#view.scale * factor);
  };
}

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

export function registerInfiniteCanvas(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-infinite-canvas")) {
    r.define("figment-infinite-canvas", FigmentInfiniteCanvas);
  }
}

if (typeof customElements !== "undefined") {
  registerInfiniteCanvas();
}
