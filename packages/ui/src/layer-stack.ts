/**
 * M4d — `<figment-layer-stack>`.
 * Z / depth ordering of slotted panels. Reorder, raise, lower;
 * DOM order = paint / hit order (later = on top).
 */

export interface LayerEntry {
  element: HTMLElement;
  id: string;
  z: number;
}

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
  }
  .stack {
    display: contents;
  }
</style>
<div class="stack" part="stack">
  <slot></slot>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentLayerStack extends BaseElement {
  #root: ShadowRoot;
  #observer: MutationObserver | null = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    this.#syncOrder();
    if (typeof MutationObserver !== "undefined") {
      this.#observer = new MutationObserver(() => this.#syncOrder());
      this.#observer.observe(this, { childList: true, subtree: true });
    }
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  /** Ordered entries (bottom → top). */
  get layers(): LayerEntry[] {
    return [...this.children]
      .filter((n): n is HTMLElement => n instanceof HTMLElement)
      .map((el, i) => ({
        element: el,
        id: el.id || `layer-${i}`,
        z: num(el.getAttribute("z"), i),
      }));
  }

  /** Raise element to top (end of DOM). */
  raise(el: HTMLElement): void {
    if (el.parentElement !== this) return;
    this.append(el);
    this.#syncOrder();
  }

  /** Lower element to bottom. */
  lower(el: HTMLElement): void {
    if (el.parentElement !== this) return;
    this.prepend(el);
    this.#syncOrder();
  }

  /** Move to a specific index (0 = bottom). */
  setIndex(el: HTMLElement, index: number): void {
    const kids = [...this.children];
    if (!kids.includes(el)) return;
    const clamped = Math.max(0, Math.min(kids.length - 1, index));
    // Insert before the element that should sit above `el`.
    const without = kids.filter((k) => k !== el);
    const before = without[clamped] ?? null;
    if (before) this.insertBefore(el, before);
    else this.append(el);
    this.#syncOrder();
  }

  #syncOrder(): void {
    const kids = [...this.children].filter((n): n is HTMLElement =>
      n instanceof HTMLElement,
    );
    kids.forEach((el, i) => {
      el.style.zIndex = String(i + 1);
    });
    this.dispatchEvent(
      new CustomEvent("figment-layers", {
        detail: this.layers.map((l) => ({ id: l.id, z: l.z })),
        bubbles: true,
      }),
    );
  }
}

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function registerLayerStack(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-layer-stack")) {
    r.define("figment-layer-stack", FigmentLayerStack);
  }
}

if (typeof customElements !== "undefined") {
  registerLayerStack();
}
