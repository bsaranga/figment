export function createMetrics() {
    return {
        paints: 0,
        layersDrawn: 0,
        dirtyRedraws: 0,
        mutationsIgnored: 0,
        inputCaptures: 0,
        nestedCanvasMarks: 0,
        skippedFrames: 0,
        seamlessSwaps: 0,
        geometryUpdates: 0,
        geometryClears: 0,
        tiltWitnesses: 0,
        tiltWitnessFailures: 0,
    };
}
export function buildState(input) {
    const state = {
        backend: input.backend,
        health: input.health,
        supported: input.supported,
        pendingEnable: input.pendingEnable,
        canvasGrid: input.canvasGrid,
        cssSize: input.cssSize,
        unitScale: input.unitScale,
        layers: input.layers,
        admission: input.admission,
        metrics: { ...input.metrics },
    };
    if (input.lastError !== undefined)
        state.lastError = input.lastError;
    return state;
}
//# sourceMappingURL=diagnostics.js.map