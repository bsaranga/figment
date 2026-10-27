/**
 * M4g — `<figment-context-menu>`.
 * Opens at a client point (right-click). Keyboard: arrows, Enter, Escape.
 * Stays inside the viewport.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
}

const TEMPLATE = `
<style>
  :host {
    display: none;
    position: fixed;
    z-index: 11000;
    min-width: 180px;
    border-radius: var(--figment-radius-md, ${DEFAULT_TOKENS["--figment-radius-md"]});
    border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
    background: var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]});
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
    padding: 6px;
    box-shadow: 0 18px 50px rgba(0,0,0,0.4);
    font-family: var(--figment-font-sans, system-ui);
  }
  :host([open]) {
    display: block;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    role: menu;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-size: var(--figment-text-sm, 14px);
  }
  li[aria-disabled="true"] {
    opacity: 0.45;
    cursor: default;
  }
  li[aria-selected="true"] {
    background: color-mix(in srgb, var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]}) 28%, transparent);
  }
  li.sep {
    padding: 0;
    height: 1px;
    margin: 6px 8px;
    background: var(--figment-color-border, rgba(148,163,204,0.18));
    cursor: default;
    pointer-events: none;
  }
  .shortcut {
    opacity: 0.55;
    font-size: var(--figment-text-xs, 12px);
    font-family: var(--figment-font-mono, monospace);
  }
</style>
<ul part="list" role="menu"></ul>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentContextMenu extends BaseElement {
  #root: ShadowRoot;
  #items: MenuItem[] = [];
  #selected = 0;
  #onDoc = (e: Event) => {
    if (!this.contains(e.target as Node)) this.close();
  };

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    window.addEventListener("click", this.#onDoc, true);
    window.addEventListener("keydown", this.#onKey, true);
    this.#render();
  }

  disconnectedCallback(): void {
    window.removeEventListener("click", this.#onDoc, true);
    window.removeEventListener("keydown", this.#onKey, true);
  }

  get items(): MenuItem[] {
    return this.#items.map((i) => ({ ...i }));
  }

  setItems(items: MenuItem[]): void {
    this.#items = items.slice();
    this.#selected = 0;
    this.#render();
  }

  get isOpen(): boolean {
    return this.hasAttribute("open");
  }

  /** Open at viewport coordinates; clamps to the window. */
  openAt(clientX: number, clientY: number): void {
    this.setAttribute("open", "");
    this.#render();
    // Measure then clamp.
    const w = this.offsetWidth || 180;
    const h = this.offsetHeight || 120;
    const x = Math.max(8, Math.min(clientX, window.innerWidth - w - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - h - 8));
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.#selected = 0;
    this.#render();
  }

  close(): void {
    this.removeAttribute("open");
    this.dispatchEvent(new CustomEvent("figment-menu-close", { bubbles: true }));
  }

  selected(): MenuItem | null {
    return this.#items.filter((i) => !i.separator && !i.disabled)[this.#selected] ?? null;
  }

  confirm(): MenuItem | null {
    const item = this.selected();
    if (!item) return null;
    this.dispatchEvent(
      new CustomEvent("figment-menu-select", {
        detail: { ...item },
        bubbles: true,
      }),
    );
    this.close();
    return item;
  }

  #render(): void {
    const ul = this.#root.querySelector("ul")!;
    ul.innerHTML = "";
    const actionable = this.#items.filter((i) => !i.separator && !i.disabled);
    let idx = 0;
    for (const item of this.#items) {
      const li = document.createElement("li");
      if (item.separator) {
        li.className = "sep";
        li.setAttribute("role", "separator");
        ul.append(li);
        continue;
      }
      li.setAttribute("role", "menuitem");
      if (item.disabled) {
        li.setAttribute("aria-disabled", "true");
      } else {
        const my = idx;
        if (my === this.#selected) li.setAttribute("aria-selected", "true");
        li.addEventListener("click", () => {
          this.#selected = my;
          this.confirm();
        });
        idx++;
      }
      li.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="shortcut">${escapeHtml(item.shortcut ?? "")}</span>`;
      ul.append(li);
    }
    void actionable;
  }

  #onKey = (e: Event): void => {
    if (!this.isOpen) return;
    const ke = e as KeyboardEvent;
    const enabled = this.#items.filter((i) => !i.separator && !i.disabled);
    if (ke.key === "Escape") {
      ke.preventDefault();
      this.close();
    } else if (ke.key === "ArrowDown") {
      ke.preventDefault();
      this.#selected = Math.min(enabled.length - 1, this.#selected + 1);
      this.#render();
    } else if (ke.key === "ArrowUp") {
      ke.preventDefault();
      this.#selected = Math.max(0, this.#selected - 1);
      this.#render();
    } else if (ke.key === "Enter") {
      ke.preventDefault();
      this.confirm();
    }
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function registerContextMenu(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-context-menu")) {
    r.define("figment-context-menu", FigmentContextMenu);
  }
}

if (typeof customElements !== "undefined") {
  registerContextMenu();
}
