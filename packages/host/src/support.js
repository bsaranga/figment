import { FigmentUnsupportedError } from "./errors.js";
function arity(fn) {
    return typeof fn === "function" ? fn.length : null;
}
export function inspectSupport(canvas) {
    const missing = [];
    const details = {};
    // content reflection ("fallback" | "drawable")
    canvas.setAttribute("content", "drawable");
    const content = canvas.content;
    details.content = content;
    if (content !== "drawable") {
        missing.push("HTMLCanvasElement.content (reflects 'drawable')");
    }
    // Probe 2D APIs on a disposable canvas — calling getContext("2d") on the
    // host canvas would lock its context type and block WebGL/WebGPU backends.
    const probe = document.createElement("canvas");
    probe.width = 2;
    probe.height = 2;
    const ctx2d = probe.getContext("2d");
    if (!ctx2d) {
        missing.push("CanvasRenderingContext2D");
    }
    else {
        const draw = ctx2d.drawElementImage;
        details.drawElementImage = typeof draw === "function" ? arity(draw) : null;
        if (typeof draw !== "function") {
            missing.push("CanvasRenderingContext2D.drawElementImage");
        }
    }
    const anyCanvas = canvas;
    details.requestPaint = typeof anyCanvas.requestPaint === "function";
    if (!details.requestPaint)
        missing.push("HTMLCanvasElement.requestPaint");
    // ElementCanvasTransform family (geometry) — required for hit sync in 3D; 2D can auto-sync.
    details.updateElementGeometry =
        typeof anyCanvas.updateElementGeometry === "function";
    return { ok: missing.length === 0, missing, details };
}
/** M2h: backend-specific functional surface checks (presence + arity). */
export function inspectBackendSupport(canvas, backend) {
    const base = inspectSupport(canvas);
    const missing = [...base.missing];
    const details = { ...base.details };
    if (backend === "webgl") {
        const gl = canvas.getContext("webgl");
        if (!gl)
            missing.push("WebGLRenderingContext");
        else {
            const tex = gl
                .texElementSubImage2D;
            details.texElementSubImage2D = typeof tex === "function";
            if (typeof tex !== "function") {
                missing.push("WebGLRenderingContext.texElementSubImage2D");
            }
        }
    }
    if (backend === "webgpu") {
        const gpu = globalThis.navigator?.gpu;
        details.navigatorGpu = !!gpu;
        if (!gpu)
            missing.push("navigator.gpu");
    }
    return { ok: missing.length === 0, missing, details };
}
export function assertSupport(canvas) {
    const report = inspectSupport(canvas);
    if (!report.ok) {
        throw new FigmentUnsupportedError("missing-api", `HTML-in-Canvas unavailable. Missing: ${report.missing.join(", ")}. ` +
            `See ACTIVATION.md for Chrome Canary flags / Origin Trial.`);
    }
    return report;
}
//# sourceMappingURL=support.js.map