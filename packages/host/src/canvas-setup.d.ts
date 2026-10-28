/**
 * Canvas + drawable attribute management.
 * Includes nested-canvas auto-mark workaround (crbug 576333009 / WICG #184).
 */
export interface NestedMark {
    canvas: HTMLCanvasElement;
    previous: string | null;
}
export declare function prepareCanvas(canvas: HTMLCanvasElement): void;
export declare function markNestedCanvases(root: ParentNode): NestedMark[];
export declare function restoreNestedMarks(marks: NestedMark[]): void;
export declare function markDrawable(el: Element): void;
export declare function unmarkDrawable(el: Element): void;
//# sourceMappingURL=canvas-setup.d.ts.map