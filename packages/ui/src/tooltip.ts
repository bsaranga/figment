/**
 * M4g — `<figment-tooltip>`.
 * 3D-aware positioning: follows a target's getBoundingClientRect through
 * CSS transforms (tilt/z), clamps to viewport, keyboard-reachable.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

const TEMPLATE = `
<style>
  :host {
    display: none;
    position: fixed;
    z-index: 12000;
    max-width: 260px;
    padding: 8px 12px;
    border-radius: var(--figment-radius-sm, ${DEFAULT_TOKENS["--figment-radius-sm"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]});
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    font-family: var(--figment-font-sans, system-ui);
    font-size: var(--figment-text-xs, 12px);
    line-height: 1.4;
    pointer-events: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  }
  :host([open]) {
    display: block;
  }
</style>
<slot></slot>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentTooltip extends BaseElement {
  #root: ShadowRoot;
  #target: HTMLElement | null = null;
  #onKey = (e: Event) => {
    if ((e as KeyboardEvent).key === "Escape") this.hide();
  };

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    window.addEventListener("keydown", this.#onKey, true);
  }

  disconnectedCallback(): void {
    window.removeEventListener("keydown", this.#onKey, true);
  }

  get isOpen(): boolean {
    return this.hasAttribute("open");
  }

  /**
   * Show near a target. Uses the target's transformed bounding rect
   * (3D-aware: works under tilt / translateZ).
   */
  showFor(target: HTMLElement, placement: "top" | "bottom" | "left" | "right" = "top"): void {
    this.#target = target;
    this.setAttribute("open", "");
    this.#place(placement);
    this.dispatchEvent(new CustomEvent("figment-tooltip-show", { bubbles: true }));
  }

  hide(): void {
    this.removeAttribute("open");
    this.#target = null;
    this.dispatchEvent(new CustomEvent("figment-tooltip-hide", { bubbles: true }));
  }

  /** Recompute position (call after layout / transform changes). */
  reflow(placement: "top" | "bottom" | "left" | "right" = "top"): void {
    if (this.isOpen && this.#target) this.#place(placement);
  }

  #place(placement: "top" | "bottom" | "left" | "right"): void {
    const t = this.#target;
    if (!t) return;
    // getBoundingClientRect is 3D-aware (projected AABB of the quad).
    const r = t.getBoundingClientRect();
    const tw = this.offsetWidth || 120;
    const th = this.offsetHeight || 32;
    const gap = 10;

    let x = 0;
    let y = 0;
    if (placement === "top") {
      x = r.left + r.width / 2 - tw / 2;
      y = r.top - th - gap;
    } else if (placement === "bottom") {
      x = r.left + r.width / 2 - tw / 2;
      y = r.bottom + gap;
    } else if (placement === "left") {
      x = r.left - tw - gap;
      y = r.top + r.height / 2 - th / 2;
    } else {
      x = r.right + gap;
      y = r.top + r.height / 2 - th / 2;
    }

    // Clamp to viewport.
    x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - th - 8));
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }
}

export function registerTooltip(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-tooltip")) {
    r.define("figment-tooltip", FigmentTooltip);
  }
}

if (typeof customElements !== "undefined") {
  registerTooltip();
}
