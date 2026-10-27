/**
 * M3l — scrollTrack: bind scroll progress → camera / layer channels.
 * Scroll is the camera (Z fly-throughs). Native scroll is source of truth;
 * we only derive channels. Honors prefers-reduced-motion.
 */

export type ScrollChannel =
  | "cameraZ"
  | "z"
  | "y"
  | "x"
  | "scale"
  | "rotateX"
  | "rotateY"
  | "opacity";

export interface ScrollChannelSpec {
  from: number;
  to: number;
  easing?: (t: number) => number;
}

export interface ScrollTrack {
  source: "window" | HTMLElement | "wheel";
  axis?: "y" | "x";
  /** progress 0..1 over the track range (start/end in px or element refs). */
  range?: { start: number | HTMLElement; end: number | HTMLElement };
  channels: Partial<Record<ScrollChannel, ScrollChannelSpec>>;
  /** Pin the stage while the track is active (classic scroll-into-screen). */
  pin?: boolean;
  /** prefers-reduced-motion policy. Default "static" (hold `from`). */
  reducedMotion?: "jump-end" | "static";
}

export interface ScrollSample {
  /** 0..1 progress along the track. */
  progress: number;
  /** Per-channel output values. */
  values: Partial<Record<ScrollChannel, number>>;
}

export interface ScrollTrackHandle {
  readonly id: string;
  readonly target: string;
  readonly track: ScrollTrack;
  /** Last computed sample. */
  sample(): ScrollSample;
  /** Force a recompute (also runs on scroll). */
  update(): ScrollSample;
  /** Detach listeners. */
  dispose(): void;
  readonly active: boolean;
}

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

function elTop(el: HTMLElement | Window): number {
  if (typeof Window !== "undefined" && el instanceof Window) return 0;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.top + (typeof scrollY === "number" ? scrollY : 0);
}

function resolveOffset(v: number | HTMLElement | undefined, fallback: number): number {
  if (typeof v === "number") return v;
  if (v && typeof v.getBoundingClientRect === "function") return elTop(v);
  return fallback;
}

/** Scroll progress 0..1 for a track. */
export function scrollProgress(
  track: ScrollTrack,
  scrollPos: number,
  viewport: number,
): number {
  const start = resolveOffset(track.range?.start, 0);
  const end = resolveOffset(
    track.range?.end,
    start + Math.max(viewport, 1) * 2,
  );
  const span = end - start;
  if (Math.abs(span) < 1e-6) return 0;
  return clamp01((scrollPos - start) / span);
}

export function sampleTrack(
  track: ScrollTrack,
  progress: number,
  reduced = prefersReducedMotion(),
): ScrollSample {
  let p = clamp01(progress);
  const policy = track.reducedMotion ?? "static";
  if (reduced) {
    if (policy === "jump-end") p = p >= 0.5 ? 1 : 0;
    else p = 0; // "static": hold start values
  }

  const values: Partial<Record<ScrollChannel, number>> = {};
  for (const [key, spec] of Object.entries(track.channels) as [
    ScrollChannel,
    ScrollChannelSpec,
  ][]) {
    const k = spec.easing ? spec.easing(p) : p;
    values[key] = spec.from + (spec.to - spec.from) * k;
  }
  return { progress: p, values };
}

let seq = 0;

/**
 * Bind a track to a target (`"camera"` or a layer id).
 * `onSample` is invoked on scroll/rAF-coalesced updates.
 */
export function scrollTrack(
  target: string,
  track: ScrollTrack,
  onSample?: (s: ScrollSample, handle: ScrollTrackHandle) => void,
): ScrollTrackHandle {
  const id = `scroll-${++seq}`;
  let last: ScrollSample = { progress: 0, values: {} };
  let active = true;
  let raf = 0;

  const readScroll = (): number => {
    if (track.source === "wheel") return 0;
    if (track.source === "window") {
      if (typeof window === "undefined") return 0;
      return track.axis === "x" ? window.scrollX : window.scrollY;
    }
    const el = track.source;
    return track.axis === "x" ? el.scrollLeft : el.scrollTop;
  };

  const viewport = (): number => {
    if (typeof window === "undefined") return 800;
    return track.axis === "x" ? window.innerWidth : window.innerHeight;
  };

  const update = (): ScrollSample => {
    const pos = readScroll();
    last = sampleTrack(track, scrollProgress(track, pos, viewport()));
    onSample?.(last, handle);
    return last;
  };

  const onScroll = () => {
    if (!active) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };

  const hasWindow = typeof window !== "undefined";
  const src: EventTarget =
    track.source === "window" || track.source === "wheel"
      ? hasWindow
        ? window
        : ({} as EventTarget)
      : track.source;
  if (track.source !== "wheel" && hasWindow) {
    src.addEventListener("scroll", onScroll, { passive: true });
  }

  const handle: ScrollTrackHandle = {
    id,
    target,
    track,
    sample: () => ({ ...last, values: { ...last.values } }),
    update,
    dispose() {
      active = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (track.source !== "wheel" && typeof window !== "undefined") {
        src.removeEventListener("scroll", onScroll);
      }
    },
    get active() {
      return active;
    },
  };

  // Initial sample (pin/reduced-motion settle).
  update();
  return handle;
}

/**
 * Apply sampled channels to a sink (host camera / layer).
 * `cameraZ` goes to the scene camera; the rest to the layer transform.
 */
export function applyScrollSample(
  target: string,
  sample: ScrollSample,
  sink: {
    setCameraZ?: (z: number) => void;
    setLayer?: (channel: Exclude<ScrollChannel, "cameraZ">, v: number) => void;
  },
): void {
  const { values } = sample;
  if (values.cameraZ !== undefined) sink.setCameraZ?.(values.cameraZ);
  for (const key of [
    "z",
    "y",
    "x",
    "scale",
    "rotateX",
    "rotateY",
    "opacity",
  ] as const) {
    const v = values[key];
    if (v === undefined) continue;
    sink.setLayer?.(key, v);
  }
  void target;
}
