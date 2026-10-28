/**
 * M5c — `<figment-hud>`.
 * Game HUD surface: emitters + protected text (copy stays readable
 * under light/glass). Accessible: real labels, live regions, focusable
 * controls — the first game HUD screen readers can use.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface HudMetric {
  id: string;
  label: string;
  value: string;
}

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    font-family: var(--figment-font-sans, system-ui);
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: color-mix(in srgb, var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]}) 88%, transparent);
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 72px;
  }
  .metric .label {
    font-size: var(--figment-text-xs, 12px);
    opacity: 0.7;
  }
  .metric .value {
    font-size: var(--figment-text-md, 16px);
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  button {
    font: inherit;
    font-size: var(--figment-text-sm, 14px);
    border-radius: var(--figment-radius-sm, 8px);
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: transparent;
    color: inherit;
    padding: 6px 12px;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]});
    outline-offset: 2px;
  }
  .live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
<div class="bar" part="bar" role="group" aria-label="HUD">
  <div class="metrics" part="metrics"></div>
  <div class="actions" part="actions"><slot name="actions"></slot></div>
</div>
<div class="live" role="status" aria-live="polite" id="live"></div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentHud extends BaseElement {
  #root: ShadowRoot;
  #metrics: HudMetric[] = [];

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", "Game HUD");
    this.#render();
  }

  get metrics(): HudMetric[] {
    return this.#metrics.map((m) => ({ ...m }));
  }

  setMetrics(list: HudMetric[]): void {
    this.#metrics = list.map((m) => ({ ...m }));
    this.#render();
  }

  /** Update a single metric and announce it politely. */
  updateMetric(id: string, value: string): void {
    const m = this.#metrics.find((x) => x.id === id);
    if (!m) return;
    m.value = value;
    this.#render();
    const live = this.#root.getElementById("live");
    if (live) live.textContent = `${m.label} ${value}`;
    this.dispatchEvent(
      new CustomEvent("figment-hud-update", {
        detail: { id, value },
        bubbles: true,
      }),
    );
  }

  /** Protected text rect in UV (for host/gpu light clamping). */
  protectedRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  #render(): void {
    const host = this.#root.querySelector(".metrics");
    if (!host) return;
    host.innerHTML = "";
    for (const m of this.#metrics) {
      const wrap = document.createElement("div");
      wrap.className = "metric";
      wrap.innerHTML = `<span class="label"></span><span class="value"></span>`;
      wrap.querySelector(".label")!.textContent = m.label;
      wrap.querySelector(".value")!.textContent = m.value;
      host.append(wrap);
    }
  }
}

export function registerHud(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-hud")) {
    r.define("figment-hud", FigmentHud);
  }
}

if (typeof customElements !== "undefined") {
  registerHud();
}
