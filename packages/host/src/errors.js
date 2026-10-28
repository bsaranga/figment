export class FigmentUnsupportedError extends Error {
    reason;
    name = "FigmentUnsupportedError";
    constructor(reason, detail) {
        super(`figment: ${reason}: ${detail}`);
        this.reason = reason;
    }
}
export class EnrollmentError extends Error {
    name = "EnrollmentError";
    constructor(message) {
        super(`figment: ${message}`);
    }
}
export class PaintTimeoutError extends Error {
    name = "PaintTimeoutError";
    constructor(message) {
        super(`figment: ${message}`);
    }
}
//# sourceMappingURL=errors.js.map