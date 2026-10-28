/**
 * Mutation filtering + non-mutation paint sources (input/focus).
 * Same-value writes are ignored; side-effect attributes always recapture.
 */
export declare const SIDE_EFFECT_ATTRIBUTES: Set<string>;
export interface MutationFilterStats {
    ignored: number;
    queued: number;
}
export interface MutationBridge {
    observer: MutationObserver;
    stop(): void;
    stats: MutationFilterStats;
}
/**
 * Observe `root` and invoke `onDirty(target)` for real visual changes.
 */
export declare function createMutationBridge(root: ParentNode, onDirty: (target: Node) => void): MutationBridge;
/**
 * Input value changes are not DOM mutations (slider thumb, typing into value).
 * Queue a capture on `input` / `focusin` / `focusout`.
 * Opt-out via `data-figment-skip-capture` on the event target.
 */
export declare function attachInputCaptures(root: ParentNode, onDirty: (target: Node) => void, stats: {
    inputCaptures: number;
}): () => void;
//# sourceMappingURL=mutations.d.ts.map