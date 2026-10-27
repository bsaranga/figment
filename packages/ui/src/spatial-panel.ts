/**
 * M4b — `<figment-spatial-panel>`.
 * Movable / tiltable panel with scene-space `z` and material presets
 * (relief | glass | none). Real HTML inside; DOM-mode CSS transforms;
 * host can enroll the same element as a GPU layer.
 */
import {
  DEFAULT_TOKENS,
  getToken,
} from "./tokens.js";

export type PanelMaterial = "none" | "relief" | "glass";

export interface SpatialPanelState {
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotation: number;
  material: PanelMaterial;
}

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    transform-style: preserve-3d;
    will-change: transform;
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    background: var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]});
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    border: 1px solid var(--figment-color-border, ${DEFAULT_TOKENS["--figment-color-border"]});
    font-family: var(--figment-font-sans, system-ui);
    font-size: var(--figment-text-sm, 14px);
    box-shadow: 0 18px 50px rgba(0,0,0,0.28);
    min-width: 160px;
    min-height: 80px;
    touch-action: none;
  }
  :host([data-material="relief"]) {
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.12),
      inset 0 -1px 0 rgba(0,0,0,0.25),
      0 18px 50px rgba(0,0,0,0.28);
  }
  :host([data-material="glass"]) {
    background: color-mix(in srgb, var(--figment-glass-tint, ${DEFAULT_TOKENS["--figment-glass-tint"]}) 28%, transparent);
    backdrop-filter: blur(12px);
    border-color: rgba(255,255,255,0.22);
  }
  :host([data-dragging="true"]) {
    cursor: grabbing;
    outline: 2px solid var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]});
    outline-offset: 2px;
  }
  .handle {
    display: flex;
    align-items: center;
    gap: var(--figment-space-2, 8px);
    padding: var(--figment-space-2, 8px) var(--figment-space-3, 16px);
    border-bottom: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    cursor: grab;
    user-select: none;
    font-weight: 600;
  }
  .body {
    padding: var(--figment-space-3, 16px);
  }
</style>
<div class="handle" part="handle">
  <span class="title"><slot name="title">Panel</slot></span>
</div>
<div class="body" part="body">
  <slot></slot>
</div>
`;

export const SPATIAL_PANEL_ATTRIBUTES = [
  "x",
  "y",
  "z",
  "rotate-x",
  "rotate-y",
  "rotation",
  "material",
  "draggable",
] as const;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentSpatialPanel extends BaseElement {
  static readonly observedAttributes = SPATIAL_PANEL_ATTRIBUTES;

  #root: ShadowRoot;
  #drag: { pointerId: number; ox: number; oy: number } | null = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    if (!this.getAttribute("role")) this.setAttribute("role", "group");
    this.#sync();
    const handle = this.#root.querySelector(".handle");
    handle?.addEventListener("pointerdown", this.#onDown);
  }

  disconnectedCallback(): void {
    const handle = this.#root.querySelector(".handle");
    handle?.removeEventListener("pointerdown", this.#onDown);
    this.#endDrag();
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  /** Scene-space position / tilt / material. */
  get state(): SpatialPanelState {
    return {
      x: num(this.getAttribute("x"), 0),
      y: num(this.getAttribute("y"), 0),
      z: num(this.getAttribute("z"), 0),
      rotateX: num(this.getAttribute("rotate-x"), 0),
      rotateY: num(this.getAttribute("rotate-y"), 0),
      rotation: num(this.getAttribute("rotation"), 0),
      material: materialOf(this.getAttribute("material")),
    };
  }

  set state(v: Partial<SpatialPanelState>) {
    if (v.x !== undefined) this.setAttribute("x", String(v.x));
    if (v.y !== undefined) this.setAttribute("y", String(v.y));
    if (v.z !== undefined) this.setAttribute("z", String(v.z));
    if (v.rotateX !== undefined) this.setAttribute("rotate-x", String(v.rotateX));
    if (v.rotateY !== undefined) this.setAttribute("rotate-y", String(v.rotateY));
    if (v.rotation !== undefined) this.setAttribute("rotation", String(v.rotation));
    if (v.material !== undefined) this.setAttribute("material", v.material);
    this.#sync();
  }

  /** Material preset. */
  get material(): PanelMaterial {
    return materialOf(this.getAttribute("material"));
  }

  set material(m: PanelMaterial) {
    this.setAttribute("material", m);
  }

  #sync(): void {
    const s = this.state;
    const origin = getToken(this, "--figment-radius-md");
    this.style.transformOrigin = `center`;
    void origin;
    // translate3d includes z (scene depth) + tilt + roll.
    this.style.transform = [
      `translate3d(${s.x}px, ${s.y}px, ${s.z}px)`,
      s.rotation ? `rotate(${s.rotation}deg)` : "",
      s.rotateX ? `rotateX(${s.rotateX}deg)` : "",
      s.rotateY ? `rotateY(${s.rotateY}deg)` : "",
    ]
      .filter(Boolean)
      .join(" ");
    this.dataset.material = s.material;
  }

  #onDown = (e: Event): void => {
    const pe = e as PointerEvent;
    if (this.getAttribute("draggable") === "false") return;
    pe.preventDefault();
    this.#drag = {
      pointerId: pe.pointerId,
      ox: pe.clientX - this.state.x,
      oy: pe.clientY - this.state.y,
    };
    this.dataset.dragging = "true";
    (e.target as HTMLElement)?.setPointerCapture?.(pe.pointerId);
    window.addEventListener("pointermove", this.#onMove);
    window.addEventListener("pointerup", this.#onUp);
  };

  #onMove = (e: Event): void => {
    if (!this.#drag) return;
    const pe = e as PointerEvent;
    if (pe.pointerId !== this.#drag.pointerId) return;
    this.state = {
      x: pe.clientX - this.#drag.ox,
      y: pe.clientY - this.#drag.oy,
    };
  };

  #onUp = (e: Event): void => {
    const pe = e as PointerEvent;
    if (this.#drag && pe.pointerId === this.#drag.pointerId) this.#endDrag();
  };

  #endDrag(): void {
    this.#drag = null;
    delete this.dataset.dragging;
    window.removeEventListener("pointermove", this.#onMove);
    window.removeEventListener("pointerup", this.#onUp);
  }
}

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function materialOf(v: string | null): PanelMaterial {
  return v === "relief" || v === "glass" ? v : "none";
}

export function registerSpatialPanel(
  registry?: CustomElementRegistry,
): void {
  const r = registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-spatial-panel")) {
    r.define("figment-spatial-panel", FigmentSpatialPanel);
  }
}

// Auto-register in browsers.
if (typeof customElements !== "undefined") {
  registerSpatialPanel();
}
