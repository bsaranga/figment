import { FigmentUnsupportedError } from "./errors.js";

/**
 * Structural support checks (presence + arity).
 * Functional probes land in M2; these only gate construction.
 * See ACTIVATION.md §3 (API churn 150/155/157).
 */

type AnyFn = (...args: never[]) => unknown;

function arity(fn: unknown): number | null {
  return typeof fn === "function" ? (fn as AnyFn).length : null;
}

export interface SupportReport {
  ok: boolean;
  missing: string[];
  details: Record<string, unknown>;
}

export function inspectSupport(canvas: HTMLCanvasElement): SupportReport {
  const missing: string[] = [];
  const details: Record<string, unknown> = {};

  // content reflection ("fallback" | "drawable")
  canvas.setAttribute("content", "drawable");
  const content = (canvas as HTMLCanvasElement & { content?: unknown }).content;
  details.content = content;
  if (content !== "drawable") {
    missing.push("HTMLCanvasElement.content (reflects 'drawable')");
  }

  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    missing.push("CanvasRenderingContext2D");
  } else {
    const draw = (ctx2d as CanvasRenderingContext2D & {
      drawElementImage?: unknown;
    }).drawElementImage;
    details.drawElementImage = typeof draw === "function" ? arity(draw) : null;
    if (typeof draw !== "function") {
      missing.push("CanvasRenderingContext2D.drawElementImage");
    }
  }

  const anyCanvas = canvas as HTMLCanvasElement & {
    requestPaint?: unknown;
    captureElementImage?: unknown;
    updateElementGeometry?: unknown;
    clearElementGeometry?: unknown;
  };
  details.requestPaint = typeof anyCanvas.requestPaint === "function";
  if (!details.requestPaint) missing.push("HTMLCanvasElement.requestPaint");

  // ElementCanvasTransform family (geometry) — required for hit sync in 3D; 2D can auto-sync.
  details.updateElementGeometry =
    typeof anyCanvas.updateElementGeometry === "function";

  return { ok: missing.length === 0, missing, details };
}

/** M2h: backend-specific functional surface checks (presence + arity). */
export function inspectBackendSupport(
  canvas: HTMLCanvasElement,
  backend: "2d" | "webgl" | "webgpu",
): SupportReport {
  const base = inspectSupport(canvas);
  const missing = [...base.missing];
  const details = { ...base.details };

  if (backend === "webgl") {
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    if (!gl) missing.push("WebGLRenderingContext");
    else {
      const tex = (gl as WebGLRenderingContext & { texElementSubImage2D?: unknown })
        .texElementSubImage2D;
      details.texElementSubImage2D = typeof tex === "function";
      if (typeof tex !== "function") {
        missing.push("WebGLRenderingContext.texElementSubImage2D");
      }
    }
  }

  if (backend === "webgpu") {
    const gpu = (globalThis as { navigator?: { gpu?: unknown } }).navigator?.gpu;
    details.navigatorGpu = !!gpu;
    if (!gpu) missing.push("navigator.gpu");
  }

  return { ok: missing.length === 0, missing, details };
}

export function assertSupport(canvas: HTMLCanvasElement): SupportReport {
  const report = inspectSupport(canvas);
  if (!report.ok) {
    throw new FigmentUnsupportedError(
      "missing-api",
      `HTML-in-Canvas unavailable. Missing: ${report.missing.join(", ")}. ` +
        `See ACTIVATION.md for Chrome Canary flags / Origin Trial.`,
    );
  }
  return report;
}
