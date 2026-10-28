export interface SupportReport {
    ok: boolean;
    missing: string[];
    details: Record<string, unknown>;
}
export declare function inspectSupport(canvas: HTMLCanvasElement): SupportReport;
/** M2h: backend-specific functional surface checks (presence + arity). */
export declare function inspectBackendSupport(canvas: HTMLCanvasElement, backend: "2d" | "webgl" | "webgpu"): SupportReport;
export declare function assertSupport(canvas: HTMLCanvasElement): SupportReport;
//# sourceMappingURL=support.d.ts.map