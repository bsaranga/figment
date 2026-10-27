/**
 * M4b2 — `<figment-z-scroll>` story stage.
 * Pinned viewport + scroll → camera Z. Real HTML panels fly through depth
 * (Awwwards / Apple scroll-into-screen). Native scroll is source of truth.
 */
import {
  DEFAULT_TOKENS,
} from "./tokens.js";
import {
  sampleTrack,
  scrollProgress,
  prefersReducedMotion,
  type ScrollSample,
} from "@figment/gpu";

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    /* tall scroll track — attribute or CSS sets the height */
    min-height: 300vh;
  }
  .track {
    position: relative;
    height: 100%;
    min-height: inherit;
  }
  .stage {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    perspective: var(--figment-z-perspective, 1200px);
    perspective-origin: 50% 50%;
    background: var(--figment-color-bg, ${DEFAULT_TOKENS["--figment-color-bg"]});
  }
  .camera {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    will-change: transform;
  }
  ::slotted(*) {
    transform-style: preserve-3d;
  }
</style>
<div class="track" part="track">
  <div class="stage" part="stage">
    <div class="camera" part="camera">
      <slot></slot>
    </div>
  </div>
</div>
`;

export interface ZScrollState {
  /** 0..1 progress along the track. */
  progress: number;
  /** Current camera Z (px). */
  cameraZ: number;
}

const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class FigmentZScroll extends BaseElement {
  static readonly observedAttributes = [
    "track-height",
    "camera-from",
    "camera-to",
    "perspective",
    "axis",
  ] as const;

  #root: ShadowRoot;
  #progress = 0;
  #cameraZ = 0;
  #onScroll = () => this.#update();

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = TEMPLATE;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("track-height")) {
      this.style.minHeight = "300vh";
    } else {
      this.style.minHeight = this.getAttribute("track-height") ?? "300vh";
    }
    const persp = this.getAttribute("perspective");
    if (persp) {
      this.style.setProperty("--figment-z-perspective", `${persp}px`);
    }
    this.#update();
    window.addEventListener("scroll", this.#onScroll, { passive: true });
    window.addEventListener("resize", this.#onScroll, { passive: true });
  }

  disconnectedCallback(): void {
    window.removeEventListener("scroll", this.#onScroll);
    window.removeEventListener("resize", this.#onScroll);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      if (this.hasAttribute("track-height")) {
        this.style.minHeight = this.getAttribute("track-height") ?? "300vh";
      }
      const persp = this.getAttribute("perspective");
      if (persp) {
        this.style.setProperty("--figment-z-perspective", `${persp}px`);
      }
      this.#update();
    }
  }

  get state(): ZScrollState {
    return { progress: this.#progress, cameraZ: this.#cameraZ };
  }

  /** Force a scroll sample (also runs on scroll). */
  update(): ZScrollState {
    this.#update();
    return this.state;
  }

  #update(): void {
    const axis = (this.getAttribute("axis") ?? "y") as "x" | "y";
    const from = num(this.getAttribute("camera-from"), 0);
    const to = num(this.getAttribute("camera-to"), -800);

    const track = {
      source: "window" as const,
      axis,
      range: {
        start: this.offsetTop,
        end: this.offsetTop + this.offsetHeight - window.innerHeight,
      },
      channels: {
        cameraZ: { from, to },
      },
      pin: true,
      ...(prefersReducedMotion() ? { reducedMotion: "static" as const } : {}),
    };

    const pos = axis === "x" ? window.scrollX : window.scrollY;
    const viewport = axis === "x" ? window.innerWidth : window.innerHeight;
    const p = scrollProgress(track, pos, viewport);
    const sample: ScrollSample = sampleTrack(track, p, prefersReducedMotion());

    this.#progress = sample.progress;
    this.#cameraZ = sample.values.cameraZ ?? from;

    const camera = this.#root.querySelector(".camera") as HTMLElement | null;
    if (camera) {
      // Camera flies into the scene (negative Z = deeper).
      camera.style.transform = `translateZ(${this.#cameraZ}px)`;
    }

    // Notify host bindings / tests.
    this.dispatchEvent(
      new CustomEvent("figment-scroll", {
        detail: this.state,
        bubbles: true,
      }),
    );
  }
}

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function registerZScroll(registry?: CustomElementRegistry): void {
  const r =
    registry ?? (typeof customElements !== "undefined" ? customElements : null);
  if (!r) return;
  if (!r.get("figment-z-scroll")) {
    r.define("figment-z-scroll", FigmentZScroll);
  }
}

if (typeof customElements !== "undefined") {
  registerZScroll();
}
