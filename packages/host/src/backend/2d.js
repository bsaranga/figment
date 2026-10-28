import { resolveOrigin } from "../layers.js";
import { clipReason, depthScale, viewZ } from "../camera.js";
/**
 * 2D backend: drawElementImage with CSS→canvas-grid scaling.
 * Geometry: 2D auto-syncs hits when preserveElementGeometry is false (default).
 */
export function drawLayers2D(opts) {
    const { ctx, layers, cssSize, unitScale, onlyDirty, camera } = opts;
    let drawn = 0;
    // M2i: high-quality bilinear sampling + source-over (premultiplied canvas).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalCompositeOperation = "source-over";
    const origin = camera.origin ?? {
        x: cssSize.x / 2,
        y: cssSize.y / 2,
    };
    for (const layer of layers) {
        if (onlyDirty && !layer.dirty)
            continue;
        // M2j: near/far clip — do not draw off-frustum layers.
        const vz = viewZ(layer.transform.z, camera);
        if (clipReason(vz, camera) !== "front") {
            layer.dirty = false;
            continue;
        }
        const el = layer.element;
        if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
            continue;
        }
        const rect = el.getBoundingClientRect();
        const layoutW = rect.width || el.clientWidth;
        const layoutH = rect.height || el.clientHeight;
        // dest size in canvas-grid px (needed for the M2e pivot even with drawAt)
        const destW = layoutW * unitScale.x;
        const destH = layoutH * unitScale.y;
        const dx = layer.drawAt
            ? layer.drawAt.x
            : (layer.transform.x + (rect.left - cssOriginLeft(el))) * unitScale.x;
        const dy = layer.drawAt
            ? layer.drawAt.y
            : (layer.transform.y + (rect.top - cssOriginTop(el))) * unitScale.y;
        ctx.save();
        if (layer.transform.opacity !== 1) {
            ctx.globalAlpha = Math.min(1, Math.max(0, layer.transform.opacity));
        }
        // M2d: canvasClip — draw only inside the clip viewport.
        if (layer.clip) {
            const sx = unitScale.x;
            const sy = unitScale.y;
            ctx.beginPath();
            ctx.rect(layer.clip.x * sx, layer.clip.y * sy, layer.clip.width * sx, layer.clip.height * sy);
            ctx.clip();
        }
        // M2e + M2j: pivot transform then depth scale about the vanishing point.
        const needsPivot = layer.transform.rotation !== 0 ||
            layer.transform.scaleX !== 1 ||
            layer.transform.scaleY !== 1;
        const zs = depthScale(vz, camera.perspective) ?? 1;
        const needsDepth = Math.abs(zs - 1) > 1e-6;
        if (needsPivot || needsDepth) {
            const pivot = resolveOrigin(layer.origin, { x: destW, y: destH });
            const originX = dx + pivot.x;
            const originY = dy + pivot.y;
            // Depth scale about the scene vanishing point (camera.origin).
            ctx.translate(origin.x * unitScale.x, origin.y * unitScale.y);
            ctx.scale(zs, zs);
            ctx.translate(-origin.x * unitScale.x, -origin.y * unitScale.y);
            // Pivot rotate/scale.
            ctx.translate(originX, originY);
            ctx.rotate((layer.transform.rotation * Math.PI) / 180);
            ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
            ctx.translate(-originX, -originY);
        }
        // drawElementImage draws the border box at (dx,dy) at natural size.
        ctx.drawElementImage(el, dx, dy);
        ctx.restore();
        layer.dirty = false;
        drawn += 1;
    }
    return drawn;
}
function cssOriginLeft(_el) {
    // Layer transforms are relative to the layer's own layout box; drawElementImage
    // places the border-box at (dx,dy). We use drawAt or transform as the dest origin.
    return 0;
}
function cssOriginTop(_el) {
    return 0;
}
//# sourceMappingURL=2d.js.map