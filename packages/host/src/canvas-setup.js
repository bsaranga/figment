/**
 * Canvas + drawable attribute management.
 * Includes nested-canvas auto-mark workaround (crbug 576333009 / WICG #184).
 */
export function prepareCanvas(canvas) {
    canvas.setAttribute("content", "drawable");
}
export function markNestedCanvases(root) {
    const marks = [];
    for (const node of root.querySelectorAll("canvas")) {
        const canvas = node;
        // Skip the owning host canvas if it is inside root (it is already drawable).
        if (canvas.hasAttribute("content") && canvas.getAttribute("content") === "drawable" && canvas.dataset.figmentHost === "1") {
            continue;
        }
        const previous = canvas.getAttribute("content");
        canvas.setAttribute("content", "drawable");
        marks.push({ canvas, previous });
    }
    return marks;
}
export function restoreNestedMarks(marks) {
    for (const mark of marks) {
        if (!mark.canvas.isConnected)
            continue;
        if (mark.previous === null) {
            mark.canvas.removeAttribute("content");
        }
        else {
            mark.canvas.setAttribute("content", mark.previous);
        }
    }
}
export function markDrawable(el) {
    if (!el.hasAttribute("drawable")) {
        el.setAttribute("drawable", "");
        el.setAttribute("data-figment-drawable", "1");
    }
}
export function unmarkDrawable(el) {
    if (el.getAttribute("data-figment-drawable") === "1") {
        el.removeAttribute("drawable");
        el.removeAttribute("data-figment-drawable");
    }
}
//# sourceMappingURL=canvas-setup.js.map