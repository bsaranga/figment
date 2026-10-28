/** Typed failure modes. figment never degrades silently. */
export type FigmentUnsupportedReason = "missing-api" | "probe-failed" | "tilt-unsupported";
export declare class FigmentUnsupportedError extends Error {
    readonly reason: FigmentUnsupportedReason;
    readonly name = "FigmentUnsupportedError";
    constructor(reason: FigmentUnsupportedReason, detail: string);
}
export declare class EnrollmentError extends Error {
    readonly name = "EnrollmentError";
    constructor(message: string);
}
export declare class PaintTimeoutError extends Error {
    readonly name = "PaintTimeoutError";
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map