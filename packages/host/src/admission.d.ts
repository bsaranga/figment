/** Must be opaque and high-contrast so AA cannot fake a pass. */
export declare const PROBE_COLOR = "#c23f53";
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
    sample: {
        x: number;
        y: number;
    };
    detail: string;
    durationMs: number;
}
export interface PixelProbeOptions {
    timeoutMs?: number;
    /** Per-channel |Δ| allowed (AA / color-space slack). Default 12. */
    tolerance?: number;
}
export declare function parseHexColor(hex: string): Rgb;
export declare function colorMatches(expected: Rgb, actual: Rgb, tolerance?: number): boolean;
/**
 * Run a disposable known-color draw + getImageData probe.
 * Does not touch the host canvas; leaves no DOM behind.
 */
export declare function runPixelProbe(options?: PixelProbeOptions): Promise<PixelProbeResult>;
/** Throws {@link FigmentUnsupportedError} with reason `probe-failed` on failure. */
export declare function assertPixelProbe(options?: PixelProbeOptions): Promise<PixelProbeResult>;
export declare const HIT_PROBE_ID = "figment-hit-probe-target";
export interface HitSample {
    label: string;
    /** Client (viewport) point used for elementFromPoint. */
    client: {
        x: number;
        y: number;
    };
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
export declare function runHitProbe(options?: HitProbeOptions): Promise<HitProbeResult>;
/** Throws {@link FigmentUnsupportedError} with reason `probe-failed` on failure. */
export declare function assertHitProbe(options?: HitProbeOptions): Promise<HitProbeResult>;
/** Combined M2a + M2b admission report. */
export interface AdmissionReport {
    pixel: PixelProbeResult;
    hit: HitProbeResult;
}
export declare function runAdmission(options?: {
    pixel?: PixelProbeOptions;
    hit?: HitProbeOptions;
}): Promise<AdmissionReport>;
export declare function assertAdmission(options?: {
    pixel?: PixelProbeOptions;
    hit?: HitProbeOptions;
}): Promise<AdmissionReport>;
//# sourceMappingURL=admission.d.ts.map