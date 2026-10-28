/**
 * M5c — `<figment-world-space-panel>`.
 * Panel anchored in 3D scene space (game / spatial world). Position via
 * x/y/z; camera-relative projection via CSS translate3d.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    transform-style: preserve-3d;
    will-change: transform;
    min-width: 140px;
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: color-mix(in srgb, var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]}) 90%, transparent);
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    font-family: var(--figment-font-sans, system-ui);
    padding: 10px 12px;
    pointer-events: auto;
  }
  .title {
    font-size: var(--figment-text-xs, 12px);
    opacity: 0.7;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
<div class="title" part="title"><slot name="title">World panel</slot></div>
<div class="body" part="body"><slot></slot></div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentWorldSpacePanel extends BaseElement {
  #root: ShadowRoot;

  static readonly observedAttributes = ["x", "y", "z", "scale"] as const;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.#sync();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#sync();
  }

  get position(): { x: number; y: number; z: number } {
    return {
      x: num(this.getAttribute("x"), 0),
      y: num(this.getAttribute("y"), 0),
      z: num(this.getAttribute("z"), 0),
    };
  }

  set position(p: { x: number; y: number; z: number }) {
    this.setAttribute("x", String(p.x));
    this.setAttribute("y", String(p.y));
    this.setAttribute("z", String(p.z));
    this.#sync();
  }

  #sync(): void {
    const { x, y, z } = this.position;
    const s = num(this.getAttribute("scale"), 1);
    this.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${s})`;
  }
}

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function registerWorldSpacePanel(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-world-space-panel")) {
    r.define("figment-world-space-panel", FigmentWorldSpacePanel);
  }
}

if (typeof customElements !== "undefined") {
  registerWorldSpacePanel();
}
