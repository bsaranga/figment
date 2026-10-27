/**
 * M5a — `<figment-virtual-grid>`.
 * Windowed 2D grid (rows × cols). Only the visible viewport stays in DOM.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface GridSize {
  rows: number;
  cols: number;
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
    top: 0;
    display: grid;
    will-change: transform;
    contain: layout style;
  }
  .cell {
    box-sizing: border-box;
    border-right: 1px solid var(--figment-color-border, rgba(148,163,204,0.12));
    border-bottom: 1px solid var(--figment-color-border, rgba(148,163,204,0.12));
    padding: 0 10px;
    display: flex;
    align-items: center;
    font-size: var(--figment-text-xs, 12px);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background: color-mix(in srgb, var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]}) 88%, transparent);
  }
</style>
<div class="spacer" part="spacer">
  <div class="window" part="window" role="grid"></div>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentVirtualGrid extends BaseElement {
  #root: ShadowRoot;
  #rows = 0;
  #cols = 1;
  #rowHeight = 36;
  #colWidth = 140;
  #overscan = 4;
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

  setSize(size: GridSize): void {
    this.#rows = Math.max(0, Math.floor(size.rows));
    this.#cols = Math.max(1, Math.floor(size.cols));
    this.#render();
  }

  get size(): GridSize {
    return { rows: this.#rows, cols: this.#cols };
  }

  setCellSize(width: number, height: number): void {
    this.#colWidth = Math.max(24, width);
    this.#rowHeight = Math.max(16, height);
    this.#render();
  }

  /** Visible cell window (row/col ranges). */
  visibleWindow(): { r0: number; r1: number; c0: number; c1: number } {
    const h = this.clientHeight || 320;
    const w = this.clientWidth || 480;
    const r0 = Math.max(0, Math.floor(this.scrollTop / this.#rowHeight) - this.#overscan);
    const r1 = Math.min(
      this.#rows,
      Math.ceil((this.scrollTop + h) / this.#rowHeight) + this.#overscan,
    );
    const c0 = Math.max(0, Math.floor(this.scrollLeft / this.#colWidth) - this.#overscan);
    const c1 = Math.min(
      this.#cols,
      Math.ceil((this.scrollLeft + w) / this.#colWidth) + this.#overscan,
    );
    return { r0, r1, c0, c1 };
  }

  renderedCount(): number {
    return this.#root.querySelectorAll(".cell").length;
  }

  #render(): void {
    const spacer = this.#root.querySelector(".spacer") as HTMLElement;
    const win = this.#root.querySelector(".window") as HTMLElement;
    spacer.style.height = `${this.#rows * this.#rowHeight}px`;
    spacer.style.width = `${this.#cols * this.#colWidth}px`;

    const { r0, r1, c0, c1 } = this.visibleWindow();
    win.style.transform = `translate(${c0 * this.#colWidth}px, ${r0 * this.#rowHeight}px)`;
    win.style.gridTemplateColumns = `repeat(${Math.max(1, c1 - c0)}, ${this.#colWidth}px)`;
    win.innerHTML = "";

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.style.height = `${this.#rowHeight}px`;
        cell.setAttribute("role", "gridcell");
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.textContent = `${r},${c}`;
        win.append(cell);
      }
    }
  }
}

export function registerVirtualGrid(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-virtual-grid")) {
    r.define("figment-virtual-grid", FigmentVirtualGrid);
  }
}

if (typeof customElements !== "undefined") {
  registerVirtualGrid();
}
