import { resolveOrigin } from "../layers.js";
import { clipReason, depthScale, viewZ } from "../camera.js";
export function buildLayerPackets(scene) {
    const { layers, cssSize, unitScale, camera, onlyDirty } = scene;
    const origin = camera.origin ?? { x: cssSize.x / 2, y: cssSize.y / 2 };
    const ox = origin.x * unitScale.x;
    const oy = origin.y * unitScale.y;
    const packets = [];
    for (const layer of layers) {
        if (onlyDirty && !layer.dirty)
            continue;
        const vz = viewZ(layer.transform.z, camera);
        if (clipReason(vz, camera) !== "front") {
            layer.dirty = false;
            continue;
        }
        const el = layer.element;
        if (!(el instanceof HTMLElement) && !(el instanceof SVGElement))
            continue;
        const rect = el.getBoundingClientRect();
        const layoutW = rect.width || el.clientWidth;
        const layoutH = rect.height || el.clientHeight;
        const destW = layoutW * unitScale.x;
        const destH = layoutH * unitScale.y;
        const x = layer.drawAt
            ? layer.drawAt.x
            : layer.transform.x * unitScale.x;
        const y = layer.drawAt
            ? layer.drawAt.y
            : layer.transform.y * unitScale.y;
        const zs = depthScale(vz, camera.perspective) ?? 1;
        const pivot = resolveOrigin(layer.origin, { x: destW, y: destH });
        packets.push({
            id: layer.id,
            element: el,
            x,
            y,
            width: destW,
            height: destH,
            zs,
            rotationDeg: layer.transform.rotation,
            scaleX: layer.transform.scaleX,
            scaleY: layer.transform.scaleY,
            opacity: layer.transform.opacity,
            pivotX: x + pivot.x,
            pivotY: y + pivot.y,
            originX: ox,
            originY: oy,
            ...(layer.clip
                ? {
                    clip: {
                        x: layer.clip.x * unitScale.x,
                        y: layer.clip.y * unitScale.y,
                        width: layer.clip.width * unitScale.x,
                        height: layer.clip.height * unitScale.y,
                    },
                }
                : {}),
        });
        layer.dirty = false;
    }
    return packets;
}
//# sourceMappingURL=scene.js.map