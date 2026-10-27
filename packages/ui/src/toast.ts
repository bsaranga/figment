/**
 * M4f — `<figment-toast>`.
 * Dissolve enter/exit via `presence` (M3j). Stacked notification surface.
 */
import { DEFAULT_TOKENS } from "./tokens.js";
import {
  DISSOLVE_EXIT,
  presence,
  type PresenceHandle,
} from "@figment/gpu";

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 9500;
    max-width: min(360px, calc(100vw - 32px));
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]});
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    padding: var(--figment-space-3, 16px);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    font-family: var(--figment-font-sans, system-ui);
    opacity: 0;
    transform: translateY(12px) scale(0.98);
    transition:
      opacity var(--figment-duration-base, 220ms) var(--figment-ease-out, ease-out),
      transform var(--figment-duration-base, 220ms) var(--figment-ease-out, ease-out);
    pointer-events: none;
  }
  :host([data-visible="true"]) {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .msg {
    flex: 1;
  }
  button {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    opacity: 0.7;
    padding: 0 4px;
  }
  button:hover {
    opacity: 1;
  }
</style>
<div class="row" role="status" aria-live="polite">
  <div class="msg"><slot></slot></div>
  <button type="button" part="close" aria-label="Dismiss">&times;</button>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentToast extends BaseElement {
  #root: ShadowRoot;
  #presence: PresenceHandle | null = null;
  #timer = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    const btn = this.#root.querySelector("button");
    btn?.addEventListener("click", () => this.hide());
    if (this.hasAttribute("open")) this.show();
  }

  disconnectedCallback(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#presence?.setPresent(false);
  }

  get isVisible(): boolean {
    return this.dataset.visible === "true";
  }

  /** Show toast; optional auto-dismiss ms. */
  show(durationMs = 0): void {
    this.#presence = presence(this, {
      present: true,
      enter: { duration: 220, easing: "ease-out", to: { opacity: 1, y: 0, scale: 1 } },
      exit: DISSOLVE_EXIT,
    });
    this.#presence.setPresent(true);
    this.dataset.visible = "true";
    this.setAttribute("open", "");
    if (this.#timer) clearTimeout(this.#timer);
    if (durationMs > 0) {
      this.#timer = setTimeout(() => this.hide(), durationMs) as unknown as number;
    }
    this.dispatchEvent(new CustomEvent("figment-toast-show", { bubbles: true }));
  }

  /** Dissolve out via presence. */
  async hide(): Promise<void> {
    if (!this.#presence) {
      this.dataset.visible = "false";
      this.removeAttribute("open");
      return;
    }
    this.#presence.setPresent(false);
    this.dataset.visible = "false";
    await this.#presence.done;
    this.removeAttribute("open");
    this.dispatchEvent(new CustomEvent("figment-toast-hide", { bubbles: true }));
  }
}

export function registerToast(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-toast")) {
    r.define("figment-toast", FigmentToast);
  }
}

if (typeof customElements !== "undefined") {
  registerToast();
}
