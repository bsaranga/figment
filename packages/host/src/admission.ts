/**
 * M2a — functional admission: known-color pixel readback.
 * Never property-sniff: only a successful draw+readback admits the pipeline.
 * See ARCHITECTURE.md §3.2 admission.ts and ACTIVATION.md §3.
 */
import { FigmentUnsupportedError } from "./errors.js";

/** Must be opaque and high-contrast so AA cannot fake a pass. */
export const PROBE_COLOR = "#c23f53";

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PixelProbeResult {
  ok: boolean;
  /** Hex of the solid fill we drew. */
  expectedHex: string;
  expected: Rgb;
  /** Readback sample, or null when draw/read never happened. */
  actual: Rgb | null;
  /** Sample point in probe-canvas grid px. */
  sample: { x: number; y: number };
  detail: string;
  durationMs: number;
}

export interface PixelProbeOptions {
  timeoutMs?: number;
  /** Per-channel |Δ| allowed (AA / color-space slack). Default 12. */
  tolerance?: number;
}

export function parseHexColor(hex: string): Rgb {
  const s = hex.replace("#", "").trim();
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`parseHexColor: not a hex color: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 255,
  };
}

export function colorMatches(
  expected: Rgb,
  actual: Rgb,
  tolerance = 12,
): boolean {
  return (
    Math.abs(expected.r - actual.r) <= tolerance &&
    Math.abs(expected.g - actual.g) <= tolerance &&
    Math.abs(expected.b - actual.b) <= tolerance &&
    actual.a >= 200
  );
}

type Drawable2D = CanvasRenderingContext2D & {
  drawElementImage: (el: Element, ...rest: number[]) => unknown;
};

function drawAndSample(
  canvas: HTMLCanvasElement,
  target: HTMLElement,
  sample: { x: number; y: number },
  timeoutMs: number,
): Promise<{ ok: true; data: Uint8ClampedArray } | { ok: false; detail: string }> {
  return new Promise((resolve) => {
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) {
      resolve({ ok: false, detail: "pixel probe: 2d context unavailable" });
      return;
    }
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const timer = setTimeout(() => {
      canvas.removeEventListener("paint", onPaint);
      resolve({
        ok: false,
        detail: `pixel probe: paint event timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    function onPaint() {
      clearTimeout(timer);
      canvas.removeEventListener("paint", onPaint);
      try {
        ctx.reset();
        // Must run during the paint event — same contract as the WICG examples.
        (ctx as Drawable2D).drawElementImage(target, 20, 20);
        const { data } = ctx.getImageData(sample.x, sample.y, 1, 1);
        resolve({ ok: true, data });
      } catch (e) {
        resolve({
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    canvas.addEventListener("paint", onPaint);
    (canvas as HTMLCanvasElement & { requestPaint(): void }).requestPaint();
  });
}

/**
 * Run a disposable known-color draw + getImageData probe.
 * Does not touch the host canvas; leaves no DOM behind.
 */
export async function runPixelProbe(
  options: PixelProbeOptions = {},
): Promise<PixelProbeResult> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const tolerance = options.tolerance ?? 12;
  const started = performance.now();
  const expected = parseHexColor(PROBE_COLOR);
  const sample = { x: 80, y: 40 };

  const shell = document.createElement("div");
  shell.setAttribute("data-figment-probe", "1");
  // Match the WICG smoke setup: on-screen canvas so the browser captures pixels.
  shell.style.cssText =
    "width:200px;height:120px;overflow:hidden;position:absolute;left:0;top:0;z-index:-1;";

  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 120;
  canvas.style.cssText = "width:200px;height:120px;background:#eee;";
  canvas.setAttribute("content", "drawable");
  shell.append(canvas);

  // Non-empty target (text helps some capture paths), solid known color.
  const target = document.createElement("div");
  target.setAttribute("drawable", "");
  target.style.cssText = `width:120px;height:40px;background:${PROBE_COLOR};color:#fff;font:14px system-ui;padding:8px;box-sizing:border-box;`;
  target.textContent = "figment";
  canvas.append(target);

  document.body.append(shell);

  const finish = (
    partial: Omit<PixelProbeResult, "durationMs">,
  ): PixelProbeResult => ({
    ...partial,
    durationMs: Math.round(performance.now() - started),
  });

  try {
    const drawn = await drawAndSample(canvas, target, sample, timeoutMs);
    if (!drawn.ok) {
      return finish({
        ok: false,
        expectedHex: PROBE_COLOR,
        expected,
        actual: null,
        sample,
        detail: drawn.detail,
      });
    }

    const data = drawn.data;
    const actual: Rgb = {
      r: data[0] ?? 0,
      g: data[1] ?? 0,
      b: data[2] ?? 0,
      a: data[3] ?? 0,
    };
    const ok = colorMatches(expected, actual, tolerance);

    return finish({
      ok,
      expectedHex: PROBE_COLOR,
      expected,
      actual,
      sample,
      detail: ok
        ? `pixel probe ok: read ${fmt(actual)} matched ${fmt(expected)} (±${tolerance})`
        : `pixel probe failed: expected ${fmt(expected)} at (${sample.x},${sample.y}), read ${fmt(actual)} (±${tolerance})`,
    });
  } catch (e) {
    return finish({
      ok: false,
      expectedHex: PROBE_COLOR,
      expected,
      actual: null,
      sample,
      detail: e instanceof Error ? e.message : String(e),
    });
  } finally {
    shell.remove();
  }
}

/** Throws {@link FigmentUnsupportedError} with reason `probe-failed` on failure. */
export async function assertPixelProbe(
  options: PixelProbeOptions = {},
): Promise<PixelProbeResult> {
  const result = await runPixelProbe(options);
  if (!result.ok) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `${result.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`,
    );
  }
  return result;
}

function fmt(c: Rgb): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}
