/** Typed failure modes. figment never degrades silently. */
export type FigmentUnsupportedReason =
  | "missing-api"
  | "probe-failed"
  | "tilt-unsupported";

export class FigmentUnsupportedError extends Error {
  readonly reason: FigmentUnsupportedReason;
  override readonly name = "FigmentUnsupportedError";

  constructor(reason: FigmentUnsupportedReason, detail: string) {
    super(`figment: ${reason}: ${detail}`);
    this.reason = reason;
  }
}

export class EnrollmentError extends Error {
  override readonly name = "EnrollmentError";
  constructor(message: string) {
    super(`figment: ${message}`);
  }
}

export class PaintTimeoutError extends Error {
  override readonly name = "PaintTimeoutError";
  constructor(message: string) {
    super(`figment: ${message}`);
  }
}
