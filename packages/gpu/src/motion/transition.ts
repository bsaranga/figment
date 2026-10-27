/**
 * M3i — motion: transition + transitionGroup (stagger).
 * Numeric channel tweens for keyed layer motion (x, y, z, scale, rotate, opacity).
 */

export type MotionChannel =
  | "x"
  | "y"
  | "z"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotation"
  | "rotateX"
  | "rotateY"
  | "opacity";

export type EasingName =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";

export interface MotionDesc {
  /** Duration in ms. Default 300. */
  duration?: number;
  /** Delay before start in ms. Default 0. */
  delay?: number;
  easing?: EasingName;
  /** Target values per channel. */
  to: Partial<Record<MotionChannel, number>>;
  /** Optional starting values (else identity + start override). */
  from?: Partial<Record<MotionChannel, number>>;
}

export interface MotionFrame {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  rotateX: number;
  rotateY: number;
  opacity: number;
}

export interface MotionHandle {
  readonly id: string;
  readonly layerId: string;
  readonly running: boolean;
  /** Current sample. */
  value(): MotionFrame;
  stop(): void;
  finish(): void;
  readonly done: Promise<void>;
}

export const DEFAULT_MOTION = {
  duration: 300,
  delay: 0,
  easing: "ease-out",
} as const;

export const IDENTITY_FRAME: MotionFrame = {
  x: 0,
  y: 0,
  z: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  rotateX: 0,
  rotateY: 0,
  opacity: 1,
};

export function ease(name: EasingName, t: number): number {
  const x = Math.max(0, Math.min(1, t));
  switch (name) {
    case "linear":
      return x;
    case "ease-in":
      return x * x;
    case "ease-out":
      return 1 - (1 - x) * (1 - x);
    case "ease-in-out":
      return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
    case "ease":
    default:
      return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sampleMotion(
  from: MotionFrame,
  to: Partial<MotionFrame>,
  t: number,
  easing: EasingName = "ease-out",
): MotionFrame {
  const k = ease(easing, t);
  return {
    x: lerp(from.x, to.x ?? from.x, k),
    y: lerp(from.y, to.y ?? from.y, k),
    z: lerp(from.z, to.z ?? from.z, k),
    scaleX: lerp(from.scaleX, to.scaleX ?? from.scaleX, k),
    scaleY: lerp(from.scaleY, to.scaleY ?? from.scaleY, k),
    rotation: lerp(from.rotation, to.rotation ?? from.rotation, k),
    rotateX: lerp(from.rotateX, to.rotateX ?? from.rotateX, k),
    rotateY: lerp(from.rotateY, to.rotateY ?? from.rotateY, k),
    opacity: lerp(from.opacity, to.opacity ?? from.opacity, k),
  };
}

export interface MotionItem {
  layerId: string;
  desc: MotionDesc;
  start?: Partial<MotionFrame>;
}

class MotionHandleImpl implements MotionHandle {
  readonly done: Promise<void>;
  private _running = true;
  private _current: MotionFrame;
  private _resolve!: () => void;

  constructor(
    readonly id: string,
    readonly layerId: string,
    private readonly from: MotionFrame,
    private readonly to: Partial<MotionFrame>,
    readonly startTime: number,
    readonly delay: number,
    readonly duration: number,
    readonly easing: EasingName,
  ) {
    this._current = { ...from };
    this.done = new Promise((r) => {
      this._resolve = r;
    });
  }

  get running(): boolean {
    return this._running;
  }

  value(): MotionFrame {
    return { ...this._current };
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    this._resolve();
  }

  finish(): void {
    this._current = sampleMotion(this.from, this.to, 1, "linear");
    this.stop();
  }

  /** Drive the tween to time `now`. */
  tick(now: number): void {
    if (!this._running) return;
    const elapsed = now - this.startTime - this.delay;
    if (elapsed < 0) return;
    const t = this.duration <= 0 ? 1 : Math.min(1, elapsed / this.duration);
    this._current = sampleMotion(this.from, this.to, t, this.easing);
    if (t >= 1) {
      this._current = sampleMotion(this.from, this.to, 1, "linear");
      this.stop();
    }
  }
}

let seq = 0;

/** Single transition (drive with {@link startMotionLoop}). */
export function transition(
  layerId: string,
  desc: MotionDesc,
  start?: Partial<MotionFrame>,
  id = `m-${++seq}`,
): MotionHandle {
  const item: MotionItem = { layerId, desc };
  if (start) item.start = start;
  return transitionGroup([item], 0, id)[0]!;
}

/**
 * Staggered group: item i starts after `i * staggerMs` (+ its own delay).
 */
export function transitionGroup(
  items: MotionItem[],
  staggerMs = 0,
  idPrefix = `g-${++seq}`,
): MotionHandle[] {
  const t0 = now();
  return items.map((item, index) => {
    const from: MotionFrame = {
      ...IDENTITY_FRAME,
      ...item.start,
      ...item.desc.from,
    };
    return new MotionHandleImpl(
      `${idPrefix}-${index}`,
      item.layerId,
      from,
      item.desc.to,
      t0,
      (item.desc.delay ?? DEFAULT_MOTION.delay) + index * staggerMs,
      item.desc.duration ?? DEFAULT_MOTION.duration,
      item.desc.easing ?? DEFAULT_MOTION.easing,
    ) as MotionHandle & { tick(n: number): void };
  });
}

/** rAF driver for running motions. Returns a dispose that stops all. */
export function startMotionLoop(
  handles: MotionHandle[],
  onFrame?: (h: MotionHandle) => void,
): () => void {
  const list = handles as (MotionHandle & { tick(n: number): void })[];
  let handle = 0;
  const tick = () => {
    const t = now();
    let any = false;
    for (const h of list) {
      if (h.running) {
        any = true;
        h.tick(t);
      }
      onFrame?.(h);
    }
    if (any) handle = raf(tick);
  };
  handle = raf(tick);
  return () => {
    if (handle) caf(handle);
    for (const h of list) h.stop();
  };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

type FrameFn = (t: number) => void;
function raf(fn: FrameFn): number {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(fn);
  }
  return setTimeout(() => fn(now()), 16) as unknown as number;
}
function caf(id: number): void {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}
