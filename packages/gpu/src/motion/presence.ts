/**
 * M3j — presence: enter / exit for mounted UI (toasts, dialogs, chips).
 * Enter runs `enter` MotionDesc from a hidden seed; exit runs `exit`
 * then reports absent (element may be unmounted by the caller).
 */
import {
  IDENTITY_FRAME,
  sampleMotion,
  startMotionLoop,
  transitionGroup,
  type MotionDesc,
  type MotionFrame,
  type MotionHandle,
} from "./transition.js";

export interface PresenceOptions {
  /** Whether the node is present in the UI. */
  present: boolean;
  /** Motion when appearing (default: fade + slight rise). */
  enter?: MotionDesc;
  /** Motion when leaving (default: fade out). */
  exit?: MotionDesc;
  /** Seed frame before enter (default: opacity 0, slight y offset). */
  enterFrom?: Partial<MotionFrame>;
  /** Seed frame for exit target (default: opacity 0). */
  exitTo?: Partial<MotionFrame>;
}

export interface PresenceHandle {
  readonly id: string;
  readonly present: boolean;
  /** "hidden" | "entering" | "visible" | "exiting" */
  readonly phase: "hidden" | "entering" | "visible" | "exiting";
  value(): MotionFrame;
  /** Flip presence (starts enter or exit). */
  setPresent(present: boolean): MotionHandle | null;
  /** True while enter/exit tween is running. */
  readonly animating: boolean;
  readonly motion: MotionHandle | null;
  readonly done: Promise<void>;
}

export const DEFAULT_ENTER: MotionDesc = {
  duration: 220,
  easing: "ease-out",
  from: { opacity: 0, y: 12, scale: 0.98 },
  to: { opacity: 1, y: 0, scale: 1 },
};

export const DEFAULT_EXIT: MotionDesc = {
  duration: 160,
  easing: "ease-in",
  from: { opacity: 1, y: 0, scale: 1 },
  to: { opacity: 0, y: 8, scale: 0.98 },
};

/** Toast-style dissolve exit (uses opacity + slight scale). */
export const DISSOLVE_EXIT: MotionDesc = {
  duration: 240,
  easing: "ease-in",
  to: { opacity: 0, scale: 0.96 },
};

let seq = 0;

class PresenceHandleImpl implements PresenceHandle {
  private _present: boolean;
  private _phase: PresenceHandle["phase"];
  private _motion: MotionHandle | null = null;
  private _current: MotionFrame;
  private _done: Promise<void> = Promise.resolve();
  private _offLoop: (() => void) | null = null;

  constructor(
    readonly id: string,
    private readonly opts: PresenceOptions,
  ) {
    this._present = opts.present;
    this._phase = opts.present ? "visible" : "hidden";
    const enter = opts.enter ?? DEFAULT_ENTER;
    const enterFrom = {
      ...IDENTITY_FRAME,
      ...DEFAULT_ENTER.from,
      ...opts.enterFrom,
    };
    // Already-present nodes start at the enter end state (no tween).
    this._current = opts.present
      ? sampleMotion(enterFrom, enter.to ?? {}, 1, "linear")
      : { ...enterFrom };
  }

  get done(): Promise<void> {
    return this._done;
  }

  get present(): boolean {
    return this._present;
  }

  get phase(): PresenceHandle["phase"] {
    return this._phase;
  }

  get animating(): boolean {
    return !!this._motion?.running;
  }

  get motion(): MotionHandle | null {
    return this._motion;
  }

  value(): MotionFrame {
    return this._motion ? this._motion.value() : { ...this._current };
  }

  setPresent(present: boolean): MotionHandle | null {
    // Retarget without stacking half-finished exits onto enters.
    this._motion?.stop();
    this._offLoop?.();
    this._present = present;

    const enter = this.opts.enter ?? DEFAULT_ENTER;
    const exit = this.opts.exit ?? DEFAULT_EXIT;
    const enterFrom = {
      ...IDENTITY_FRAME,
      ...DEFAULT_ENTER.from,
      ...this.opts.enterFrom,
    };
    const exitTo = {
      ...IDENTITY_FRAME,
      ...DEFAULT_EXIT.to,
      ...this.opts.exitTo,
    };

    if (present) {
      this._phase = "entering";
      const start = { ...enterFrom, ...this.value() };
      const handle = transitionGroup(
        [{ layerId: this.id, desc: { ...enter, from: start }, start }],
        0,
        `presence-enter-${++seq}`,
      )[0]!;
      this._motion = handle;
      let resolveDone!: () => void;
      this._done = new Promise<void>((r) => {
        resolveDone = r;
      });
      this._offLoop = startMotionLoop([handle], (h) => {
        this._current = h.value();
        if (!h.running) {
          this._phase = "visible";
          resolveDone();
          this._offLoop?.();
          this._offLoop = null;
        }
      });
      return handle;
    }

    this._phase = "exiting";
    const start = this.value();
    const handle = transitionGroup(
      [
        {
          layerId: this.id,
          desc: { ...exit, from: start, to: { ...exit.to, ...exitTo } },
          start,
        },
      ],
      0,
      `presence-exit-${++seq}`,
    )[0]!;
    this._motion = handle;
    let resolveDone!: () => void;
    this._done = new Promise<void>((r) => {
      resolveDone = r;
    });
    this._offLoop = startMotionLoop([handle], (h) => {
      this._current = h.value();
      if (!h.running) {
        this._phase = "hidden";
        resolveDone();
        this._offLoop?.();
        this._offLoop = null;
      }
    });
    return handle;
  }
}

/**
 * Bind presence to a UI node (toast, modal, chip).
 * Call `setPresent` when mount state flips; await `done` before unmount.
 */
export function presence(
  _el: Element | null,
  opts: PresenceOptions,
): PresenceHandle {
  return new PresenceHandleImpl(`presence-${++seq}`, opts);
}
