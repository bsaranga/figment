/**
 * M2a/M2b — functional admission: known-color pixel readback + hit probe.
 * Never property-sniff: only real draw/readback and elementFromPoint hits admit.
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

// ---------------------------------------------------------------------------
// M2b — elementFromPoint hit probe at transformed points
// ---------------------------------------------------------------------------

export const HIT_PROBE_ID = "figment-hit-probe-target";

export interface HitSample {
  label: string;
  /** Client (viewport) point used for elementFromPoint. */
  client: { x: number; y: number };
  /** Element id that must be hit, or null when the point must miss the target. */
  expectedId: string | null;
  actualId: string | null;
  matched: boolean;
}

export interface HitProbeResult {
  ok: boolean;
  /** CSS transform applied to the target (forces non-identity hit mapping). */
  transform: string;
  samples: HitSample[];
  detail: string;
  durationMs: number;
}

export interface HitProbeOptions {
  /** CSS transform for the target. Default translate+rotate. */
  transform?: string;
  timeoutMs?: number;
}

/**
 * Place a transformed target in the document and verify `elementFromPoint`
 * at interior + exterior points after the transform is applied.
 */
export async function runHitProbe(
  options: HitProbeOptions = {},
): Promise<HitProbeResult> {
  const started = performance.now();
  const transform =
    options.transform ?? "translate(48px, 32px) rotate(8deg) skewX(-4deg)";
  const timeoutMs = options.timeoutMs ?? 2000;

  const shell = document.createElement("div");
  shell.setAttribute("data-figment-hit-probe", "1");
  // On-screen so elementFromPoint can resolve; stacked above page chrome.
  shell.style.cssText =
    "position:fixed;left:16px;top:16px;width:240px;height:160px;z-index:2147483000;pointer-events:none;";

  const target = document.createElement("div");
  target.id = HIT_PROBE_ID;
  target.style.cssText = [
    "position:absolute",
    "left:20px",
    "top:20px",
    "width:80px",
    "height:40px",
    `transform:${transform}`,
    "transform-origin:top left",
    "background:#1b2230",
    "pointer-events:auto",
  ].join(";");
  shell.append(target);
  document.body.append(shell);

  const finish = (partial: Omit<HitProbeResult, "durationMs">): HitProbeResult => ({
    ...partial,
    durationMs: Math.round(performance.now() - started),
  });

  try {
    // Let layout + transform apply before sampling.
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 0);
      requestAnimationFrame(() => {
        clearTimeout(t);
        resolve();
      });
    });

    const rect = target.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return finish({
        ok: false,
        transform,
        samples: [],
        detail: `hit probe: target has empty box (${rect.width}×${rect.height})`,
      });
    }

    // Local border-box samples → client via a zero-size marker (works under
    // rotate/skew; AABB corners of a transformed quad are NOT on the element).
    const localPoints: { label: string; lx: number; ly: number }[] = [
      { label: "center", lx: 40, ly: 20 },
      { label: "local-tl", lx: 10, ly: 8 },
      { label: "local-tr", lx: 70, ly: 8 },
      { label: "local-bl", lx: 10, ly: 32 },
      { label: "local-br", lx: 70, ly: 32 },
    ];

    // Exterior: well clear of the transformed AABB so the target cannot win.
    const exterior: { label: string; x: number; y: number }[] = [
      { label: "miss-left", x: rect.left - 24, y: rect.top + rect.height / 2 },
      { label: "miss-right", x: rect.right + 24, y: rect.top + rect.height / 2 },
      {
        label: "miss-far",
        x: rect.right + 120,
        y: rect.bottom + 120,
      },
    ];

    const samples: HitSample[] = [];

    for (const p of localPoints) {
      const client = clientFromLocal(target, p.lx, p.ly);
      const hit = document.elementFromPoint(client.x, client.y);
      const actualId =
        (hit && (hit.id || hit.getAttribute("data-testid"))) ||
        (hit?.tagName.toLowerCase() ?? null);
      const matched = !!hit && (hit === target || target.contains(hit));
      samples.push({
        label: p.label,
        client,
        expectedId: HIT_PROBE_ID,
        actualId: matched ? HIT_PROBE_ID : actualId,
        matched,
      });
    }

    for (const p of exterior) {
      const hit = document.elementFromPoint(p.x, p.y);
      const matched = !!hit && (hit === target || target.contains(hit));
      samples.push({
        label: p.label,
        client: { x: p.x, y: p.y },
        expectedId: null,
        actualId: matched
          ? HIT_PROBE_ID
          : (hit?.id || hit?.tagName.toLowerCase() || null),
        matched: !matched,
      });
    }

    const ok = samples.every((s) => s.matched);
    const failed = samples.filter((s) => !s.matched);

    return finish({
      ok,
      transform,
      samples,
      detail: ok
        ? `hit probe ok: ${samples.length} points matched under transform (${transform})`
        : `hit probe failed at ${failed.map((s) => `${s.label}→${s.actualId}`).join(", ")} under transform (${transform})`,
    });
  } catch (e) {
    return finish({
      ok: false,
      transform,
      samples: [],
      detail: e instanceof Error ? e.message : String(e),
    });
  } finally {
    shell.remove();
  }
}

/** Throws {@link FigmentUnsupportedError} with reason `probe-failed` on failure. */
export async function assertHitProbe(
  options: HitProbeOptions = {},
): Promise<HitProbeResult> {
  const result = await runHitProbe(options);
  if (!result.ok) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `${result.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`,
    );
  }
  return result;
}

/** Client coords of a local border-box point under the element's transform. */
function clientFromLocal(
  target: HTMLElement,
  lx: number,
  ly: number,
): { x: number; y: number } {
  const marker = document.createElement("i");
  marker.setAttribute("data-figment-hit-marker", "1");
  marker.style.cssText = `position:absolute;left:${lx}px;top:${ly}px;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;`;
  target.append(marker);
  try {
    const r = marker.getBoundingClientRect();
    return { x: r.left, y: r.top };
  } finally {
    marker.remove();
  }
}

/** Combined M2a + M2b admission report. */
export interface AdmissionReport {
  pixel: PixelProbeResult;
  hit: HitProbeResult;
}

export async function runAdmission(
  options: { pixel?: PixelProbeOptions; hit?: HitProbeOptions } = {},
): Promise<AdmissionReport> {
  const pixel = await runPixelProbe(options.pixel);
  const hit = await runHitProbe(options.hit);
  return { pixel, hit };
}

export async function assertAdmission(
  options: { pixel?: PixelProbeOptions; hit?: HitProbeOptions } = {},
): Promise<AdmissionReport> {
  const report = await runAdmission(options);
  if (!report.pixel.ok) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `${report.pixel.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`,
    );
  }
  if (!report.hit.ok) {
    throw new FigmentUnsupportedError(
      "probe-failed",
      `${report.hit.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`,
    );
  }
  return report;
}
