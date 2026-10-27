/**
 * M4d — `<figment-minimap>`.
 * World overview: mini viewport over the infinite canvas. Shows panel
 * bounds and a camera/viewport rectangle; click to jump.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface MinimapItem {
  id: string;
  /** World rect (px). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinimapView {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TEMPLATE = `
<style>
  :host {
    display: block;
    width: 180px;
    height: 120px;
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: color-mix(in srgb, var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]}) 90%, transparent);
    overflow: hidden;
    position: relative;
    cursor: crosshair;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
<canvas part="canvas"></canvas>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentMinimap extends BaseElement {
  #root: ShadowRoot;
  #items: MinimapItem[] = [];
  #view: MinimapView = { x: 0, y: 0, width: 1000, height: 800 };

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
    this.addEventListener("click", this.#onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#onClick);
  }

  /** World-space items to draw. */
  setItems(items: MinimapItem[]): void {
    this.#items = items.slice();
    this.draw();
  }

  get items(): MinimapItem[] {
    return this.#items.map((i) => ({ ...i }));
  }

  /** Visible world viewport (camera frustum in 2D). */
  setView(view: MinimapView): void {
    this.#view = { ...view };
    this.draw();
  }

  get view(): MinimapView {
    return { ...this.#view };
  }

  /** Redraw the overview. */
  draw(): void {
    const canvas = this.#root.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas || typeof canvas.getContext !== "function") return;
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    const w = this.clientWidth || 180;
    const h = this.clientHeight || 120;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const world = this.#bounds();
    const sx = w / Math.max(1, world.width);
    const sy = h / Math.max(1, world.height);
    const s = Math.min(sx, sy);

    // Items
    for (const it of this.#items) {
      const x = (it.x - world.x) * s;
      const y = (it.y - world.y) * s;
      const iw = Math.max(2, it.width * s);
      const ih = Math.max(2, it.height * s);
      ctx.fillStyle = "rgba(124, 156, 255, 0.55)";
      ctx.fillRect(x, y, iw, ih);
    }

    // Viewport rect
    const vx = (this.#view.x - world.x) * s;
    const vy = (this.#view.y - world.y) * s;
    const vw = Math.max(4, this.#view.width * s);
    const vh = Math.max(4, this.#view.height * s);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }

  #bounds(): { x: number; y: number; width: number; height: number } {
    let minX = this.#view.x;
    let minY = this.#view.y;
    let maxX = this.#view.x + this.#view.width;
    let maxY = this.#view.y + this.#view.height;
    for (const it of this.#items) {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + it.width);
      maxY = Math.max(maxY, it.y + it.height);
    }
    const pad = 40;
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2),
    };
  }

  #onClick = (e: Event): void => {
    const pe = e as MouseEvent;
    const r = this.getBoundingClientRect();
    const u = (pe.clientX - r.left) / Math.max(1, r.width);
    const v = (pe.clientY - r.top) / Math.max(1, r.height);
    const world = this.#bounds();
    const wx = world.x + u * world.width;
    const wy = world.y + v * world.height;
    this.dispatchEvent(
      new CustomEvent("figment-minimap-jump", {
        detail: { x: wx, y: wy },
        bubbles: true,
      }),
    );
  };
}

export function registerMinimap(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-minimap")) {
    r.define("figment-minimap", FigmentMinimap);
  }
}

if (typeof customElements !== "undefined") {
  registerMinimap();
}
