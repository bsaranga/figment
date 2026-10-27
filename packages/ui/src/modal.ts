/**
 * M4f — `<figment-modal>`.
 * Focus trap + `inert` background while open. Escape closes; restores focus.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

const TEMPLATE = `
<style>
  :host {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9000;
    align-items: center;
    justify-content: center;
    font-family: var(--figment-font-sans, system-ui);
  }
  :host([open]) {
    display: flex;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(7, 9, 15, 0.55);
  }
  .dialog {
    position: relative;
    width: min(480px, calc(100vw - 32px));
    border-radius: var(--figment-radius-lg, ${DEFAULT_TOKENS["--figment-radius-lg"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]});
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
    padding: var(--figment-space-4, 24px);
    outline: none;
  }
  .title {
    margin: 0 0 8px;
    font-size: var(--figment-text-lg, 22px);
    letter-spacing: -0.02em;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  button {
    font: inherit;
    border-radius: var(--figment-radius-sm, 8px);
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: transparent;
    color: inherit;
    padding: 8px 14px;
    cursor: pointer;
  }
  button.primary {
    background: var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]});
    color: #0b0d12;
    border-color: transparent;
    font-weight: 600;
  }
</style>
<div class="backdrop" part="backdrop"></div>
<div class="dialog" part="dialog" role="dialog" aria-modal="true" tabindex="-1">
  <h2 class="title" part="title"><slot name="title">Dialog</slot></h2>
  <div class="body" part="body"><slot></slot></div>
  <div class="actions" part="actions">
    <slot name="actions">
      <button type="button" data-close>Close</button>
    </slot>
  </div>
</div>
`;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentModal extends BaseElement {
  #root: ShadowRoot;
  #restore: HTMLElement | null = null;
  #onKey = (e: Event) => this.#trap(e as KeyboardEvent);

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "dialog");
    const backdrop = this.#root.querySelector(".backdrop");
    const closeBtn = this.#root.querySelector("[data-close]");
    backdrop?.addEventListener("click", () => this.close());
    closeBtn?.addEventListener("click", () => this.close());
  }

  disconnectedCallback(): void {
    this.#teardown();
  }

  get isOpen(): boolean {
    return this.hasAttribute("open");
  }

  open(): void {
    if (this.isOpen) return;
    this.#restore =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    this.setAttribute("open", "");
    // Inert the rest of the page (modal contract).
    if (typeof document !== "undefined") {
      for (const el of document.body.children) {
        if (el !== this) el.setAttribute("inert", "");
      }
    }
    window.addEventListener("keydown", this.#onKey, true);
    this.#focusFirst();
    this.dispatchEvent(new CustomEvent("figment-modal-open", { bubbles: true }));
  }

  close(): void {
    if (!this.isOpen) return;
    this.removeAttribute("open");
    this.#teardown();
    this.#restore?.focus?.();
    this.dispatchEvent(new CustomEvent("figment-modal-close", { bubbles: true }));
  }

  #teardown(): void {
    window.removeEventListener("keydown", this.#onKey, true);
    if (typeof document !== "undefined") {
      for (const el of document.body.children) {
        el.removeAttribute("inert");
      }
    }
  }

  #focusFirst(): void {
    const dialog = this.#root.querySelector(".dialog") as HTMLElement | null;
    const slot = this.#root.querySelector("slot") as HTMLSlotElement | null;
    const assigned = slot
      ? slot.assignedElements({ flatten: true }).filter(isFocusable)
      : [];
    const target = assigned[0] ?? dialog;
    target?.focus?.();
  }

  #trap(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = this.#focusable();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = (this.#root.activeElement ?? document.activeElement) as HTMLElement | null;
    if (e.shiftKey && (active === first || !this.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  #focusable(): HTMLElement[] {
    const slot = this.#root.querySelector("slot") as HTMLSlotElement | null;
    const assigned = slot
      ? slot.assignedElements({ flatten: true }).filter(isFocusable)
      : [];
    const local = [...this.#root.querySelectorAll<HTMLElement>(FOCUSABLE)];
    return [...assigned, ...local];
  }
}

function isFocusable(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(FOCUSABLE);
}

export function registerModal(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-modal")) {
    r.define("figment-modal", FigmentModal);
  }
}

if (typeof customElements !== "undefined") {
  registerModal();
}
