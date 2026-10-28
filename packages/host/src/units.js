import { computeUnitScale } from "./geometry.js";
/**
 * Keep canvas bitmap grid aligned with device pixels (crisp text).
 * See ACTIVATION.md "three coordinate systems".
 */
export function attachUnits(canvas, onChange) {
    const readCss = () => ({
        x: canvas.clientWidth || canvas.getBoundingClientRect().width,
        y: canvas.clientHeight || canvas.getBoundingClientRect().height,
    });
    let state = {
        canvasGrid: { x: canvas.width, y: canvas.height },
        cssSize: readCss(),
        scale: { x: 1, y: 1 },
    };
    state.scale = computeUnitScale(state.canvasGrid, state.cssSize);
    const apply = (grid, css) => {
        if (canvas.width !== Math.round(grid.x))
            canvas.width = Math.round(grid.x);
        if (canvas.height !== Math.round(grid.y))
            canvas.height = Math.round(grid.y);
        state = {
            canvasGrid: { x: canvas.width, y: canvas.height },
            cssSize: css,
            scale: computeUnitScale({ x: canvas.width, y: canvas.height }, css),
        };
        onChange(state);
    };
    const supportsDPCB = typeof ResizeObserverEntry !== "undefined" &&
        "devicePixelContentBoxSize" in ResizeObserverEntry.prototype;
    const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry)
            return;
        const dpc = supportsDPCB ? entry.devicePixelContentBoxSize?.[0] : undefined;
        const css = {
            x: entry.contentRect.width,
            y: entry.contentRect.height,
        };
        const grid = dpc
            ? { x: dpc.inlineSize, y: dpc.blockSize }
            : {
                x: Math.round(css.x * window.devicePixelRatio),
                y: Math.round(css.y * window.devicePixelRatio),
            };
        apply(grid, css);
    });
    observer.observe(canvas, supportsDPCB ? { box: "device-pixel-content-box" } : {});
    return {
        state: () => state,
        stop() {
            observer.disconnect();
        },
    };
}
//# sourceMappingURL=units.js.map