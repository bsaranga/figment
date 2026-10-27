/**
 * M5a — `<figment-virtual-list>` / windowed rows.
 * Only visible rows stay in the DOM (canvas-perf for 10k+ items).
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface VirtualListOptions {
  rowHeight?: number;
  overscan?: number;
}

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: auto;
    height: 100%;
    font-family: var(--figment-font-sans, system-ui);
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
  }
  .spacer {
    position: relative;
    width: 100%;
  }
  .window {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    will-change: transform;
  }
  .row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0 12px;
    border-bottom: 1px solid var(--figment-color-border, rgba(148,163,204,0.12));
    font-size: var(--figment-text-sm, 14px);
    contain: layout style;
  }
  .row:focus-visible {
    outline: 2px solid var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]});
    outline-offset: -2px;
  }
</style>
<div class="spacer" part="spacer">
  <div class="window" part="window" role="listbox"></div>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentVirtualList extends BaseElement {
  #root: ShadowRoot;
  #count = 0;
  #rowHeight = 36;
  #overscan = 6;
  #items: string[] = [];
  #onScroll = () => this.#render();

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    this.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#render();
  }

  disconnectedCallback(): void {
    this.removeEventListener("scroll", this.#onScroll);
  }

  /** Total row count. */
  setCount(n: number): void {
    this.#count = Math.max(0, Math.floor(n));
    this.#render();
  }

  get count(): number {
    return this.#count;
  }

  setRowHeight(h: number): void {
    this.#rowHeight = Math.max(8, h);
    this.#render();
  }

  get rowHeight(): number {
    return this.#rowHeight;
  }

  setOverscan(n: number): void {
    this.#overscan = Math.max(0, n);
    this.#render();
  }

  /**
   * Optional row label provider (for tests / simple lists).
   * When set, rows render as text; otherwise use the `renderRow` slot API
   * via the `figment-render-row` event.
   */
  setLabels(labels: string[]): void {
    this.#items = labels.slice();
    this.#count = labels.length;
    this.#render();
  }

  /** Visible row index range (inclusive start, exclusive end). */
  visibleRange(): { start: number; end: number } {
    const h = this.clientHeight || 320;
    const start = Math.max(0, Math.floor(this.scrollTop / this.#rowHeight) - this.#overscan);
    const end = Math.min(
      this.#count,
      Math.ceil((this.scrollTop + h) / this.#rowHeight) + this.#overscan,
    );
    return { start, end };
  }

  /** Number of DOM row nodes currently rendered (should stay small). */
  renderedCount(): number {
    return this.#root.querySelectorAll(".row").length;
  }

  #render(): void {
    const spacer = this.#root.querySelector(".spacer") as HTMLElement;
    const win = this.#root.querySelector(".window") as HTMLElement;
    spacer.style.height = `${this.#count * this.#rowHeight}px`;
    const { start, end } = this.visibleRange();
    win.style.transform = `translateY(${start * this.#rowHeight}px)`;
    win.innerHTML = "";
    for (let i = start; i < end; i++) {
      const row = document.createElement("div");
      row.className = "row";
      row.style.height = `${this.#rowHeight}px`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-posinset", String(i + 1));
      row.setAttribute("aria-setsize", String(this.#count));
      row.tabIndex = -1;
      row.dataset.index = String(i);
      const label = this.#items[i] ?? `Row ${i + 1}`;
      row.textContent = label;
      win.append(row);
    }
  }
}

export function registerVirtualList(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-virtual-list")) {
    r.define("figment-virtual-list", FigmentVirtualList);
  }
}

if (typeof customElements !== "undefined") {
  registerVirtualList();
}
