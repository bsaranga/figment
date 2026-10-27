/**
 * M4e — `<figment-command-palette>`.
 * Glass preset + ⌘K. Filterable command list with full keyboard nav
 * (arrows, Enter, Escape). Usable on canvas — real input, real semantics.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

export interface CommandItem {
  id: string;
  label: string;
  /** Optional secondary line. */
  hint?: string;
  /** Keyboard shortcut display, e.g. "⌘K". */
  shortcut?: string;
  /** When false, item is hidden from filter. */
  enabled?: boolean;
}

export interface PaletteOpenDetail {
  open: boolean;
  query: string;
}

const TEMPLATE = `
<style>
  :host {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 10000;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    font-family: var(--figment-font-sans, system-ui);
  }
  :host([open]) {
    display: flex;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(7, 9, 15, 0.45);
  }
  .panel {
    position: relative;
    width: min(560px, calc(100vw - 32px));
    border-radius: var(--figment-radius-lg, ${DEFAULT_TOKENS["--figment-radius-lg"]});
    border: 1px solid rgba(255,255,255,0.22);
    background: color-mix(in srgb, var(--figment-glass-tint, ${DEFAULT_TOKENS["--figment-glass-tint"]}) 22%, #12161f);
    backdrop-filter: blur(18px) saturate(140%);
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
    overflow: hidden;
    color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
  }
  .search {
    display: flex;
    align-items: center;
    gap: var(--figment-space-2, 8px);
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .search input {
    flex: 1;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--figment-text-md, 16px);
    outline: none;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 8px;
    max-height: 320px;
    overflow: auto;
    role: listbox;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
  }
  .item[aria-selected="true"] {
    background: color-mix(in srgb, var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]}) 28%, transparent);
  }
  .hint {
    opacity: 0.65;
    font-size: var(--figment-text-xs, 12px);
  }
  .empty {
    padding: 16px;
    opacity: 0.6;
  }
</style>
<div class="backdrop" part="backdrop"></div>
<div class="panel" part="panel" role="dialog" aria-modal="true" aria-label="Command palette">
  <div class="search">
    <input type="text" part="input" role="combobox" aria-expanded="true"
           aria-controls="list" aria-autocomplete="list" placeholder="Type a command…" />
  </div>
  <ul class="list" id="list" part="list" role="listbox"></ul>
</div>
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentCommandPalette extends BaseElement {
  #root: ShadowRoot;
  #commands: CommandItem[] = [];
  #filtered: CommandItem[] = [];
  #selected = 0;
  #open = false;
  #onKey = (e: Event) => this.#onGlobalKey(e as KeyboardEvent);

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    const input = this.#root.querySelector("input")!;
    const backdrop = this.#root.querySelector(".backdrop")!;
    input.addEventListener("input", () => this.#filter(input.value));
    input.addEventListener("keydown", (e) => this.#onInputKey(e as KeyboardEvent));
    backdrop.addEventListener("click", () => this.close());
    window.addEventListener("keydown", this.#onKey, true);
    this.#render();
  }

  disconnectedCallback(): void {
    window.removeEventListener("keydown", this.#onKey, true);
  }

  get commands(): CommandItem[] {
    return this.#commands.map((c) => ({ ...c }));
  }

  setCommands(list: CommandItem[]): void {
    this.#commands = list.map((c) => ({ enabled: true, ...c }));
    this.#filter(this.#query());
    this.#render();
  }

  get isOpen(): boolean {
    return this.#open;
  }

  open(): void {
    this.#open = true;
    this.setAttribute("open", "");
    const input = this.#root.querySelector("input")!;
    input.value = "";
    this.#filter("");
    input.focus();
    this.#emitOpen();
  }

  close(): void {
    this.#open = false;
    this.removeAttribute("open");
    this.#emitOpen();
  }

  toggle(): void {
    if (this.#open) this.close();
    else this.open();
  }

  /** Currently highlighted command (for tests / a11y). */
  selectedCommand(): CommandItem | null {
    return this.#filtered[this.#selected] ?? null;
  }

  /** Run the selected command. */
  confirm(): CommandItem | null {
    const item = this.selectedCommand();
    if (!item) return null;
    this.dispatchEvent(
      new CustomEvent("figment-command", {
        detail: { ...item },
        bubbles: true,
      }),
    );
    this.close();
    return item;
  }

  #query(): string {
    return (this.#root.querySelector("input") as HTMLInputElement | null)?.value ?? "";
  }

  #filter(query: string): void {
    const q = query.trim().toLowerCase();
    this.#filtered = this.#commands.filter((c) => {
      if (c.enabled === false) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        (c.hint ?? "").toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
    this.#selected = 0;
    this.#render();
  }

  #render(): void {
    const list = this.#root.querySelector(".list")!;
    list.innerHTML = "";
    if (this.#filtered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No commands";
      list.append(empty);
      return;
    }
    this.#filtered.forEach((cmd, i) => {
      const li = document.createElement("li");
      li.className = "item";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === this.#selected ? "true" : "false");
      li.id = `cmd-${cmd.id}`;
      li.innerHTML = `<span>${escapeHtml(cmd.label)}</span><span class="hint">${escapeHtml(cmd.shortcut ?? cmd.hint ?? "")}</span>`;
      li.addEventListener("click", () => {
        this.#selected = i;
        this.confirm();
      });
      list.append(li);
    });
  }

  #onGlobalKey(e: KeyboardEvent): void {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      this.toggle();
    } else if (e.key === "Escape" && this.#open) {
      e.preventDefault();
      this.close();
    }
  }

  #onInputKey(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.#selected = Math.min(this.#filtered.length - 1, this.#selected + 1);
      this.#render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.#selected = Math.max(0, this.#selected - 1);
      this.#render();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.confirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
  }

  #emitOpen(): void {
    this.dispatchEvent(
      new CustomEvent<PaletteOpenDetail>("figment-palette", {
        detail: { open: this.#open, query: this.#query() },
        bubbles: true,
      }),
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function registerCommandPalette(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-command-palette")) {
    r.define("figment-command-palette", FigmentCommandPalette);
  }
}

if (typeof customElements !== "undefined") {
  registerCommandPalette();
}
