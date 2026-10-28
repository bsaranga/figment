import type { HostBackend, HostState } from "./types.js";
import type { Vec2 } from "./geometry.js";
import type { AdmissionReport } from "./admission.js";
export interface Metrics {
    paints: number;
    layersDrawn: number;
    dirtyRedraws: number;
    mutationsIgnored: number;
    inputCaptures: number;
    nestedCanvasMarks: number;
    skippedFrames: number;
    /** M2c: seamless swaps performed (0 until first complete frame reveals). */
    seamlessSwaps: number;
    /** M2d: updateElementGeometry / clearElementGeometry calls. */
    geometryUpdates: number;
    geometryClears: number;
    /** M2g: tilt admission witnesses. */
    tiltWitnesses: number;
    tiltWitnessFailures: number;
}
export declare function createMetrics(): Metrics;
export declare function buildState(input: {
    backend: HostBackend;
    health: HostState["health"];
    supported: boolean;
    pendingEnable: boolean;
    canvasGrid: Vec2;
    cssSize: Vec2;
    unitScale: Vec2;
    layers: {
        id: string;
        dirty: boolean;
    }[];
    admission: AdmissionReport | null;
    metrics: Metrics;
    lastError?: string;
}): HostState;
//# sourceMappingURL=diagnostics.d.ts.map