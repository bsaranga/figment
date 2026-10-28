const DEG2RAD = Math.PI / 180;
export const DEFAULT_PERSPECTIVE = 1200;
export const MAX_TILT_DEG = 60;
export function clampTiltDeg(deg) {
    return Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, deg));
}
function identity4() {
    return {
        m11: 1, m12: 0, m13: 0, m14: 0,
        m21: 0, m22: 1, m23: 0, m24: 0,
        m31: 0, m32: 0, m33: 1, m34: 0,
        m41: 0, m42: 0, m43: 0, m44: 1,
    };
}
/** row × col for CSS matrix3d column-major storage. */
function mul4(a, b) {
    const at = [
        [a.m11, a.m21, a.m31, a.m41],
        [a.m12, a.m22, a.m32, a.m42],
        [a.m13, a.m23, a.m33, a.m43],
        [a.m14, a.m24, a.m34, a.m44],
    ];
    const bt = [
        [b.m11, b.m21, b.m31, b.m41],
        [b.m12, b.m22, b.m32, b.m42],
        [b.m13, b.m23, b.m33, b.m43],
        [b.m14, b.m24, b.m34, b.m44],
    ];
    const out = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) {
                s += at[i][k] * bt[k][j];
            }
            out[i][j] = s;
        }
    }
    return {
        m11: out[0][0], m12: out[1][0], m13: out[2][0], m14: out[3][0],
        m21: out[0][1], m22: out[1][1], m23: out[2][1], m24: out[3][1],
        m31: out[0][2], m32: out[1][2], m33: out[2][2], m34: out[3][2],
        m41: out[0][3], m42: out[1][3], m43: out[2][3], m44: out[3][3],
    };
}
function translate4(x, y) {
    const m = identity4();
    return { ...m, m41: x, m42: y };
}
function perspective4(p) {
    const m = identity4();
    return { ...m, m34: -1 / p };
}
function rotateXThenY(ax, ay) {
    const rx = ax * DEG2RAD;
    const ry = ay * DEG2RAD;
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    // R = Rx · Ry (CSS `rotateX() rotateY()` applies Y then X in local space)
    const r11 = cy;
    const r12 = 0;
    const r13 = sy;
    const r21 = sx * sy;
    const r22 = cx;
    const r23 = -sx * cy;
    const r31 = -cx * sy;
    const r32 = sx;
    const r33 = cx * cy;
    // CSS matrix3d columns
    return {
        m11: r11, m12: r21, m13: r31, m14: 0,
        m21: r12, m22: r22, m23: r32, m24: 0,
        m31: r13, m32: r23, m33: r33, m34: 0,
        m41: 0, m42: 0, m43: 0, m44: 1,
    };
}
/**
 * CSS-compatible projective matrix for a panel of `width`×`height`
 * tilted about `origin` (fraction of the box, default center).
 * Order: `perspective(P) rotateX(ax) rotateY(ay)`.
 */
export function composeTiltMatrix(opts) {
    const perspective = opts.tilt.perspective && opts.tilt.perspective > 0
        ? opts.tilt.perspective
        : DEFAULT_PERSPECTIVE;
    const ax = clampTiltDeg(opts.tilt.x);
    const ay = clampTiltDeg(opts.tilt.y);
    const ox = (opts.originX ?? 0.5) * opts.width;
    const oy = (opts.originY ?? 0.5) * opts.height;
    const matrix = mul4(translate4(ox, oy), mul4(perspective4(perspective), mul4(rotateXThenY(ax, ay), translate4(-ox, -oy))));
    return { matrix, perspective, tiltX: ax, tiltY: ay };
}
/** CSS shorthand (DOM hits + layout). */
export function tiltToCss(tilt, originX = 0.5, originY = 0.5) {
    const perspective = tilt.perspective && tilt.perspective > 0
        ? tilt.perspective
        : DEFAULT_PERSPECTIVE;
    const ax = clampTiltDeg(tilt.x);
    const ay = clampTiltDeg(tilt.y);
    const ox = `${(originX * 100).toFixed(4)}%`;
    const oy = `${(originY * 100).toFixed(4)}%`;
    return `perspective(${perspective}px) rotateX(${ax}deg) rotateY(${ay}deg)`;
}
/** Convert to DOMMatrix when the platform provides it (browser). */
export function toDOMMatrix(m) {
    return new DOMMatrix([
        m.m11, m.m12, m.m13, m.m14,
        m.m21, m.m22, m.m23, m.m24,
        m.m31, m.m32, m.m33, m.m34,
        m.m41, m.m42, m.m43, m.m44,
    ]);
}
/**
 * Transform local box corners; report which sit in front of the viewer (w > 0).
 */
export function cornersInFront(pm, width, height) {
    const pts = [
        { name: "tl", x: 0, y: 0 },
        { name: "tr", x: width, y: 0 },
        { name: "br", x: width, y: height },
        { name: "bl", x: 0, y: height },
    ];
    const m = pm.matrix;
    return pts.map((p) => {
        const x = m.m11 * p.x + m.m21 * p.y + m.m41;
        const y = m.m12 * p.x + m.m22 * p.y + m.m42;
        const w = m.m14 * p.x + m.m24 * p.y + m.m44;
        return {
            corner: p.name,
            x: w === 0 ? x : x / w,
            y: w === 0 ? y : y / w,
            w,
            front: w > 0,
        };
    });
}
/** True when every corner is in front of the viewer (safe to hit-test). */
export function tiltFacingViewer(pm, width, height) {
    return cornersInFront(pm, width, height).every((c) => c.front);
}
/**
 * Functional witness: apply the tilt, sample transformed local points with
 * elementFromPoint, refuse when hits do not match the visual quad.
 * Synchronous — forces layout before sampling.
 */
export function witnessTilt(opts) {
    const el = opts.element;
    const prevTransform = opts.previousTransform ?? el.style.transform;
    const prevOrigin = opts.previousTransformOrigin ?? el.style.transformOrigin;
    const width = el.offsetWidth || el.getBoundingClientRect().width;
    const height = el.offsetHeight || el.getBoundingClientRect().height;
    if (width < 2 || height < 2) {
        return {
            ok: false,
            samples: [],
            detail: `tilt witness: element has empty box (${width}×${height})`,
        };
    }
    const originX = opts.originX ?? 0.5;
    const originY = opts.originY ?? 0.5;
    el.style.transformOrigin = `${(originX * 100).toFixed(4)}% ${(originY * 100).toFixed(4)}%`;
    el.style.transform = tiltToCss(opts.tilt, originX, originY);
    // Force layout so getBoundingClientRect / elementFromPoint see the quad.
    void el.offsetWidth;
    opts.syncHits?.();
    void el.offsetWidth;
    // Inset well inside the border box — extreme corners sit on the projective
    // silhouette and can miss by a few px under moderate tilt.
    const ix = Math.max(16, width * 0.18);
    const iy = Math.max(14, height * 0.18);
    const localPoints = [
        { label: "center", lx: width / 2, ly: height / 2 },
        { label: "tl", lx: ix, ly: iy },
        { label: "tr", lx: width - ix, ly: iy },
        { label: "bl", lx: ix, ly: height - iy },
        { label: "br", lx: width - ix, ly: height - iy },
    ];
    const samples = [];
    for (const p of localPoints) {
        const marker = document.createElement("i");
        marker.setAttribute("data-figment-tilt-marker", "1");
        marker.style.cssText = `position:absolute;left:${p.lx}px;top:${p.ly}px;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;`;
        el.append(marker);
        let client = { x: 0, y: 0 };
        try {
            const r = marker.getBoundingClientRect();
            client = { x: r.left, y: r.top };
        }
        finally {
            marker.remove();
        }
        const hit = document.elementFromPoint(client.x, client.y);
        const matched = !!hit && (hit === el || el.contains(hit));
        samples.push({
            label: p.label,
            client,
            matched,
            actualId: matched
                ? el.id || "target"
                : (hit?.id || hit?.tagName.toLowerCase() || null),
        });
    }
    el.style.transform = prevTransform;
    el.style.transformOrigin = prevOrigin;
    const failed = samples.filter((s) => !s.matched);
    const ok = samples.length > 0 && failed.length === 0;
    return {
        ok,
        samples,
        detail: ok
            ? `tilt witness ok: ${samples.length} points matched under ${tiltToCss(opts.tilt, originX, originY)}`
            : `tilt witness failed at ${failed.map((s) => s.label).join(", ")} under ${tiltToCss(opts.tilt, originX, originY)}`,
    };
}
//# sourceMappingURL=tilt.js.map