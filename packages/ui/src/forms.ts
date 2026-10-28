/**
 * M5b — form controls: input / select / slider / checkbox.
 * Native semantics preserved — real `<input>`/`<select>` inside so
 * keyboard, IME, validation, and screen readers work unchanged.
 */
import { DEFAULT_TOKENS } from "./tokens.js";

const fieldCss = `
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--figment-font-sans, system-ui);
  color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
  font-size: var(--figment-text-sm, 14px);
`;

const controlCss = `
  font: inherit;
  color: inherit;
  border-radius: var(--figment-radius-sm, ${DEFAULT_TOKENS["--figment-radius-sm"]});
  border: 1px solid var(--figment-color-border, rgba(148,163,204,0.18));
  background: color-mix(in srgb, var(--figment-color-surface, ${DEFAULT_TOKENS["--figment-color-surface"]}) 92%, transparent);
  padding: 8px 10px;
  outline: none;
`;

const labelCss = `
  opacity: 0.8;
  font-size: var(--figment-text-xs, 12px);
`;

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

/** Shared chrome: shadow root + native control accessor. */
export class FigmentField extends BaseElement {
  #root: ShadowRoot;

  constructor(template: string) {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = template;
  }

  protected get root(): ShadowRoot {
    return this.#root;
  }

  /** Native control (value / IME / selection APIs). */
  get control(): HTMLElement | null {
    return this.#root.querySelector("input, select");
  }

  override focus(): void {
    this.control?.focus();
  }
}

// --- input ---
export class FigmentInput extends FigmentField {
  static readonly observedAttributes = ["value", "placeholder", "type"] as const;

  constructor() {
    super(`<style>
      :host { ${fieldCss} }
      label { ${labelCss} }
      input { ${controlCss} width: 100%; box-sizing: border-box; }
    </style>
    <label part="label"><slot name="label">Label</slot></label>
    <input part="input" />`);
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    const input = this.control as HTMLInputElement;
    for (const attr of [
      "type",
      "value",
      "placeholder",
      "name",
      "disabled",
      "required",
      "min",
      "max",
      "step",
      "autocomplete",
    ] as const) {
      if (this.hasAttribute(attr)) {
        input.setAttribute(attr, this.getAttribute(attr) ?? "");
      }
    }
    input.addEventListener("input", () => {
      this.setAttribute("value", input.value);
      this.dispatchEvent(
        new CustomEvent("figment-input", {
          detail: { value: input.value },
          bubbles: true,
        }),
      );
    });
    input.addEventListener("compositionstart", () => {
      this.setAttribute("data-ime", "1");
    });
    input.addEventListener("compositionend", () => {
      this.removeAttribute("data-ime");
      this.setAttribute("value", input.value);
    });
  }

  get value(): string {
    return (this.control as HTMLInputElement | null)?.value ?? "";
  }

  set value(v: string) {
    this.setAttribute("value", v);
    const c = this.control as HTMLInputElement | null;
    if (c) c.value = v;
  }
}

// --- select ---
export class FigmentSelect extends FigmentField {
  constructor() {
    super(`<style>
      :host { ${fieldCss} }
      label { ${labelCss} }
      select { ${controlCss} width: 100%; }
    </style>
    <label part="label"><slot name="label">Choose</slot></label>
    <select part="select"></select>`);
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    const select = this.control as HTMLSelectElement;
    this.querySelectorAll("option").forEach((o) =>
      select.append(o.cloneNode(true)),
    );
    if (this.hasAttribute("value")) select.value = this.getAttribute("value")!;
    select.addEventListener("change", () => {
      this.setAttribute("value", select.value);
      this.dispatchEvent(
        new CustomEvent("figment-change", {
          detail: { value: select.value },
          bubbles: true,
        }),
      );
    });
  }

  get value(): string {
    return (this.control as HTMLSelectElement | null)?.value ?? "";
  }

  set value(v: string) {
    this.setAttribute("value", v);
    const c = this.control as HTMLSelectElement | null;
    if (c) c.value = v;
  }
}

// --- slider ---
export class FigmentSlider extends FigmentField {
  constructor() {
    super(`<style>
      :host { ${fieldCss} }
      label { ${labelCss} }
      input[type="range"] { width: 100%; accent-color: var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]}); }
    </style>
    <label part="label"><slot name="label">Value</slot></label>
    <input part="slider" type="range" min="0" max="100" step="1" />`);
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    const input = this.control as HTMLInputElement;
    for (const attr of ["min", "max", "step", "value"] as const) {
      if (this.hasAttribute(attr)) {
        input.setAttribute(attr, this.getAttribute(attr) ?? "");
      }
    }
    input.addEventListener("input", () => {
      this.setAttribute("value", input.value);
      this.dispatchEvent(
        new CustomEvent("figment-input", {
          detail: { value: Number(input.value) },
          bubbles: true,
        }),
      );
    });
  }

  get value(): number {
    return Number((this.control as HTMLInputElement | null)?.value ?? 0);
  }

  set value(v: number) {
    this.setAttribute("value", String(v));
    const c = this.control as HTMLInputElement | null;
    if (c) c.value = String(v);
  }
}

// --- checkbox ---
export class FigmentCheckbox extends FigmentField {
  constructor() {
    super(`<style>
      :host {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--figment-font-sans, system-ui);
        color: var(--figment-color-text, ${DEFAULT_TOKENS["--figment-color-text"]});
        font-size: var(--figment-text-sm, 14px);
      }
      input { accent-color: var(--figment-color-accent, ${DEFAULT_TOKENS["--figment-color-accent"]}); width: 16px; height: 16px; }
      label { cursor: pointer; }
    </style>
    <input part="checkbox" type="checkbox" id="c" />
    <label for="c" part="label"><slot name="label">Label</slot></label>`);
  }

  connectedCallback(): void {
    const input = this.control as HTMLInputElement;
    input.checked = this.hasAttribute("checked");
    input.disabled = this.hasAttribute("disabled");
    input.addEventListener("change", () => {
      this.toggleAttribute("checked", input.checked);
      this.dispatchEvent(
        new CustomEvent("figment-change", {
          detail: { checked: input.checked },
          bubbles: true,
        }),
      );
    });
  }

  get checked(): boolean {
    return (this.control as HTMLInputElement | null)?.checked ?? false;
  }

  set checked(v: boolean) {
    this.toggleAttribute("checked", v);
    const c = this.control as HTMLInputElement | null;
    if (c) c.checked = v;
  }
}

export function registerFormControls(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  const defs: [string, typeof HTMLElement][] = [
    ["figment-input", FigmentInput],
    ["figment-select", FigmentSelect],
    ["figment-slider", FigmentSlider],
    ["figment-checkbox", FigmentCheckbox],
  ];
  for (const [tag, cls] of defs) {
    if (!r.get(tag)) r.define(tag, cls);
  }
}

if (typeof customElements !== "undefined") {
  registerFormControls();
}
