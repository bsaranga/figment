/**
 * Canvas + drawable attribute management.
 * Includes nested-canvas auto-mark workaround (crbug 576333009 / WICG #184).
 */

export interface NestedMark {
  canvas: HTMLCanvasElement;
  previous: string | null;
}

export function prepareCanvas(canvas: HTMLCanvasElement): void {
  canvas.setAttribute("content", "drawable");
}

export function markNestedCanvases(root: ParentNode): NestedMark[] {
  const marks: NestedMark[] = [];
  for (const node of root.querySelectorAll("canvas")) {
    const canvas = node as HTMLCanvasElement;
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

export function restoreNestedMarks(marks: NestedMark[]): void {
  for (const mark of marks) {
    if (!mark.canvas.isConnected) continue;
    if (mark.previous === null) {
      mark.canvas.removeAttribute("content");
    } else {
      mark.canvas.setAttribute("content", mark.previous);
    }
  }
}

export function markDrawable(el: Element): void {
  if (!el.hasAttribute("drawable")) {
    el.setAttribute("drawable", "");
    el.setAttribute("data-figment-drawable", "1");
  }
}

export function unmarkDrawable(el: Element): void {
  if (el.getAttribute("data-figment-drawable") === "1") {
    el.removeAttribute("drawable");
    el.removeAttribute("data-figment-drawable");
  }
}
